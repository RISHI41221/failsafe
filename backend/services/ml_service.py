from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
import shap
from sklearn.preprocessing import LabelEncoder


PROJECT_ROOT = Path(__file__).resolve().parents[2]
RAW_DATA_DIR = PROJECT_ROOT / "data" / "raw"
MODEL_DIR = PROJECT_ROOT / "data" / "models"

MODEL_PATH = MODEL_DIR / "failsafe_xgboost_model.pkl"
FEATURES_PATH = MODEL_DIR / "failsafe_expected_features.pkl"
MATH_DATA_PATH = RAW_DATA_DIR / "student-mat.csv"
PORTUGUESE_DATA_PATH = RAW_DATA_DIR / "student-por.csv"

BINARY_COLUMNS = [
    "school",
    "sex",
    "address",
    "famsize",
    "Pstatus",
    "schoolsup",
    "famsup",
    "paid",
    "activities",
    "nursery",
    "higher",
    "internet",
    "romantic",
]

NOMINAL_COLUMNS = ["Mjob", "Fjob", "reason", "guardian"]
SENSITIVE_FEATURES = [
    "sex",
    "age",
    "address",
    "famsize",
    "Pstatus",
    "Mjob",
    "Fjob",
    "reason",
    "guardian",
    "nursery",
    "romantic",
    "subject",
]

MODEL: Any | None = None
EXPECTED_FEATURES: list[str] | None = None
EXPLAINER: shap.TreeExplainer | None = None
BINARY_ENCODERS: dict[str, LabelEncoder] | None = None
REQUIRED_INPUT_COLUMNS: list[str] | None = None


def _load_reference_training_frame() -> pd.DataFrame:
    """Rebuild the reference training frame so inference uses matching encodings."""
    if not MATH_DATA_PATH.exists():
        raise FileNotFoundError(f"Reference dataset not found: {MATH_DATA_PATH}")
    if not PORTUGUESE_DATA_PATH.exists():
        raise FileNotFoundError(
            f"Reference dataset not found: {PORTUGUESE_DATA_PATH}"
        )

    math_frame = pd.read_csv(MATH_DATA_PATH, sep=";")
    math_frame["subject"] = 0

    portuguese_frame = pd.read_csv(PORTUGUESE_DATA_PATH, sep=";")
    portuguese_frame["subject"] = 1

    return pd.concat([math_frame, portuguese_frame], ignore_index=True)


def _build_binary_encoders(reference_frame: pd.DataFrame) -> dict[str, LabelEncoder]:
    """Fit one encoder per binary column using the original training corpus."""
    encoders: dict[str, LabelEncoder] = {}
    for column_name in BINARY_COLUMNS:
        encoder = LabelEncoder()
        encoder.fit(reference_frame[column_name].astype(str))
        encoders[column_name] = encoder
    return encoders


def _ensure_artifacts_loaded() -> None:
    """Lazy-load model assets so the API can start before training artifacts exist."""
    global MODEL, EXPECTED_FEATURES, EXPLAINER, BINARY_ENCODERS, REQUIRED_INPUT_COLUMNS

    if (
        MODEL is not None
        and EXPECTED_FEATURES is not None
        and EXPLAINER is not None
        and BINARY_ENCODERS is not None
        and REQUIRED_INPUT_COLUMNS is not None
    ):
        return

    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Trained model not found: {MODEL_PATH}")
    if not FEATURES_PATH.exists():
        raise FileNotFoundError(f"Expected feature list not found: {FEATURES_PATH}")

    MODEL = joblib.load(MODEL_PATH)
    loaded_features = joblib.load(FEATURES_PATH)
    EXPECTED_FEATURES = [str(feature_name) for feature_name in loaded_features]
    EXPLAINER = shap.TreeExplainer(MODEL)

    reference_frame = _load_reference_training_frame()
    BINARY_ENCODERS = _build_binary_encoders(reference_frame)
    REQUIRED_INPUT_COLUMNS = [
        column_name
        for column_name in reference_frame.columns
        if column_name not in {"G2", "G3"}
    ]


def _read_student_dataframe(csv_content: bytes) -> pd.DataFrame:
    """Read uploaded CSV bytes, preferring the semicolon format used by training data."""
    if not csv_content:
        raise ValueError("Uploaded CSV content is empty.")

    buffer = BytesIO(csv_content)
    dataframe = pd.read_csv(buffer, sep=";")

    # Fall back to comma-separated CSVs if the file was uploaded in a common export format.
    if dataframe.shape[1] == 1:
        buffer.seek(0)
        dataframe = pd.read_csv(buffer)

    if dataframe.empty:
        raise ValueError("Uploaded CSV does not contain any student rows.")

    return dataframe


def _normalize_subject_column(dataframe: pd.DataFrame) -> pd.DataFrame:
    """Ensure the inference frame always contains the training `subject` feature."""
    working_frame = dataframe.copy()

    if "subject" not in working_frame.columns:
        working_frame["subject"] = 0
        return working_frame

    subject_series = working_frame["subject"]
    if pd.api.types.is_numeric_dtype(subject_series):
        working_frame["subject"] = subject_series.fillna(0).astype(int).clip(0, 1)
        return working_frame

    normalized_values = subject_series.astype(str).str.strip().str.lower()
    subject_mapping = {
        "0": 0,
        "1": 1,
        "math": 0,
        "mat": 0,
        "mathematics": 0,
        "portuguese": 1,
        "por": 1,
        "language": 1,
    }
    working_frame["subject"] = normalized_values.map(subject_mapping).fillna(0).astype(
        int
    )
    return working_frame


def _extract_student_ids(dataframe: pd.DataFrame) -> list[int]:
    """Use uploaded student IDs when present, otherwise generate row-based identifiers."""
    if "student_id" not in dataframe.columns:
        return list(range(1, len(dataframe) + 1))

    numeric_ids = pd.to_numeric(dataframe["student_id"], errors="coerce")
    fallback_ids = pd.Series(range(1, len(dataframe) + 1), index=dataframe.index)
    return numeric_ids.fillna(fallback_ids).astype(int).tolist()


def _validate_input_columns(dataframe: pd.DataFrame) -> None:
    """Require the same raw input schema used during model training."""
    assert REQUIRED_INPUT_COLUMNS is not None

    missing_columns = sorted(set(REQUIRED_INPUT_COLUMNS) - set(dataframe.columns))
    if missing_columns:
        raise ValueError(
            "Uploaded CSV is missing required columns: "
            + ", ".join(missing_columns)
        )


def _preprocess_student_dataframe(dataframe: pd.DataFrame) -> pd.DataFrame:
    """Mirror the training pipeline so inference features match the trained model."""
    _ensure_artifacts_loaded()
    assert EXPECTED_FEATURES is not None
    assert BINARY_ENCODERS is not None

    working_frame = _normalize_subject_column(dataframe)
    _validate_input_columns(working_frame)

    working_frame = working_frame.drop(
        columns=[
            column_name
            for column_name in ["student_id", "G2", "G3", "at_risk"]
            if column_name in working_frame.columns
        ],
        errors="ignore",
    )

    for column_name in BINARY_COLUMNS:
        encoder = BINARY_ENCODERS[column_name]
        column_values = working_frame[column_name].astype(str)

        unknown_values = sorted(set(column_values) - set(encoder.classes_))
        if unknown_values:
            raise ValueError(
                f"Unexpected values in binary column '{column_name}': "
                + ", ".join(unknown_values)
            )

        working_frame[column_name] = encoder.transform(column_values)

    encoded_frame = pd.get_dummies(
        working_frame,
        columns=NOMINAL_COLUMNS,
        drop_first=True,
        dtype=int,
    )

    return encoded_frame.reindex(columns=EXPECTED_FEATURES, fill_value=0)


def _get_shap_matrix(features: pd.DataFrame) -> np.ndarray:
    """Return a two-dimensional SHAP contribution matrix for the positive class."""
    assert EXPLAINER is not None

    try:
        shap_output = EXPLAINER(features)
        shap_values = getattr(shap_output, "values", shap_output)
    except Exception:
        shap_values = EXPLAINER.shap_values(features)

    if isinstance(shap_values, list):
        shap_values = shap_values[-1]

    shap_matrix = np.asarray(shap_values)
    if shap_matrix.ndim == 3:
        shap_matrix = shap_matrix[:, :, -1]

    if shap_matrix.ndim != 2:
        raise ValueError("Unable to interpret SHAP output for the uploaded student data.")

    return shap_matrix


def _extract_top_risk_factors(
    feature_names: list[str], shap_row: np.ndarray, limit: int = 3
) -> list[dict[str, float | str]]:
    """Select the most important features contributing to risk for one student."""
    valid_indices = [
        index
        for index, feature_name in enumerate(feature_names)
        if not feature_name.startswith(tuple(SENSITIVE_FEATURES))
    ]

    ranked_positive_indices = sorted(
        [index for index in valid_indices if shap_row[index] > 0],
        key=lambda index: shap_row[index],
        reverse=True,
    )

    selected_indices = ranked_positive_indices[:limit]
    if len(selected_indices) < limit:
        for index in sorted(
            valid_indices,
            key=lambda valid_index: abs(shap_row[valid_index]),
            reverse=True,
        ):
            if index not in selected_indices:
                selected_indices.append(int(index))
            if len(selected_indices) == limit:
                break

    return [
        {
            "feature": feature_names[index],
            "impact": float(shap_row[index]),
        }
        for index in selected_indices
    ]


def generate_interventions(top_features: list[str]) -> list[str]:
    """Translate key risk factors into concrete support recommendations."""
    interventions: list[str] = []

    def append_unique(message: str) -> None:
        if message not in interventions:
            interventions.append(message)

    for feature_name in top_features:
        normalized_name = feature_name.lower()

        if "absences" in normalized_name:
            append_unique(
                "Schedule an attendance intervention to identify barriers and improve daily participation."
            )
        elif "failures" in normalized_name:
            append_unique(
                "Provide targeted academic recovery support with tutoring and weekly progress monitoring."
            )
        elif "freetime" in normalized_name:
            append_unique(
                "Review after-school routines and help the student build a more structured study schedule."
            )
        elif "studytime" in normalized_name:
            append_unique(
                "Create a guided study plan with protected time blocks and regular teacher check-ins."
            )
        elif "goout" in normalized_name:
            append_unique(
                "Discuss peer and social commitments to reduce conflicts with school performance."
            )
        elif "dalc" in normalized_name or "walc" in normalized_name:
            append_unique(
                "Coordinate a wellbeing check-in focused on substance-use risk factors and healthy coping strategies."
            )
        elif "traveltime" in normalized_name:
            append_unique(
                "Evaluate transportation or scheduling barriers that may be reducing punctuality and energy for learning."
            )
        elif "health" in normalized_name:
            append_unique(
                "Refer the student for a wellness review to address health issues affecting academic performance."
            )
        elif "internet" in normalized_name:
            append_unique(
                "Assess access to digital learning resources and provide offline or school-based alternatives when needed."
            )
        elif "higher" in normalized_name:
            append_unique(
                "Use mentoring and goal-setting conversations to strengthen academic motivation and long-term planning."
            )
        elif "famrel" in normalized_name or "guardian" in normalized_name:
            append_unique(
                "Engage the family or guardian in a support plan with clear academic goals and communication checkpoints."
            )

    if not interventions:
        interventions.append(
            "Arrange a counselor and teacher review to build a personalized academic support plan."
        )

    return interventions


def process_student_csv(csv_content: bytes) -> list[dict[str, Any]]:
    """Score uploaded student records and generate explainable intervention outputs."""
    _ensure_artifacts_loaded()
    assert MODEL is not None

    student_frame = _read_student_dataframe(csv_content)
    student_ids = _extract_student_ids(student_frame)
    feature_frame = _preprocess_student_dataframe(student_frame)

    predictions = MODEL.predict(feature_frame)
    probabilities = MODEL.predict_proba(feature_frame)[:, 1]
    shap_matrix = _get_shap_matrix(feature_frame)
    feature_names = feature_frame.columns.tolist()

    results: list[dict[str, Any]] = []
    for row_index, student_id in enumerate(student_ids):
        top_risk_factors = _extract_top_risk_factors(
            feature_names=feature_names,
            shap_row=shap_matrix[row_index],
            limit=3,
        )
        recommended_interventions = generate_interventions(
            [factor["feature"] for factor in top_risk_factors]
        )

        results.append(
            {
                "student_id": int(student_id),
                "at_risk_prediction": int(predictions[row_index]),
                "risk_probability": float(probabilities[row_index]),
                "top_risk_factors": top_risk_factors,
                "recommended_interventions": recommended_interventions,
            }
        )

    return results
