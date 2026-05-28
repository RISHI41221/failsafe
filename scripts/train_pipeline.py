from __future__ import annotations

from pathlib import Path
from typing import Iterable

import joblib
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder


PROJECT_ROOT = Path(__file__).resolve().parents[1]
RAW_DATA_DIR = PROJECT_ROOT / "data" / "raw"
MODEL_DIR = PROJECT_ROOT / "data" / "models"

MATH_DATA_PATH = RAW_DATA_DIR / "student-mat.csv"
PORTUGUESE_DATA_PATH = RAW_DATA_DIR / "student-por.csv"
MODEL_OUTPUT_PATH = MODEL_DIR / "failsafe_xgboost_model.pkl"
FEATURES_OUTPUT_PATH = MODEL_DIR / "failsafe_expected_features.pkl"

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


def validate_required_columns(
    dataframe: pd.DataFrame, required_columns: Iterable[str], context: str
) -> None:
    """Raise a clear error if any expected columns are missing."""
    missing_columns = sorted(set(required_columns) - set(dataframe.columns))
    if missing_columns:
        raise ValueError(
            f"Missing required columns in {context}: {', '.join(missing_columns)}"
        )


def load_subject_dataset(csv_path: Path, subject_value: int) -> pd.DataFrame:
    """Load a subject dataset and append its subject indicator."""
    if not csv_path.exists():
        raise FileNotFoundError(f"Input dataset not found: {csv_path}")

    dataframe = pd.read_csv(csv_path, sep=";")
    dataframe["subject"] = subject_value
    return dataframe


def build_training_dataframe() -> pd.DataFrame:
    """Load both datasets and merge them into a single training frame."""
    math_dataframe = load_subject_dataset(MATH_DATA_PATH, subject_value=0)
    portuguese_dataframe = load_subject_dataset(PORTUGUESE_DATA_PATH, subject_value=1)

    merged_dataframe = pd.concat(
        [math_dataframe, portuguese_dataframe],
        axis=0,
        ignore_index=True,
    )
    return merged_dataframe


def encode_features(features: pd.DataFrame) -> pd.DataFrame:
    """Apply label encoding to binary columns and one-hot encoding to nominal columns."""
    encoded_features = features.copy()

    for column_name in BINARY_COLUMNS:
        label_encoder = LabelEncoder()
        encoded_features[column_name] = label_encoder.fit_transform(
            encoded_features[column_name].astype(str)
        )

    encoded_features = pd.get_dummies(
        encoded_features,
        columns=NOMINAL_COLUMNS,
        drop_first=True,
        dtype=int,
    )

    return encoded_features


def prepare_features_and_target(
    dataframe: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.Series]:
    """Create the binary target and return the encoded training features."""
    validate_required_columns(
        dataframe,
        ["G2", "G3", *BINARY_COLUMNS, *NOMINAL_COLUMNS],
        context="merged dataset",
    )

    working_dataframe = dataframe.copy()
    working_dataframe["at_risk"] = (working_dataframe["G3"] < 10).astype(int)

    # Remove leakage-prone grade columns after the target is created.
    working_dataframe = working_dataframe.drop(columns=["G2", "G3"])

    target = working_dataframe.pop("at_risk")
    features = encode_features(working_dataframe)
    return features, target


def train_model(features: pd.DataFrame, target: pd.Series) -> xgb.XGBClassifier:
    """Split the data and fit the XGBoost classifier."""
    x_train, _, y_train, _ = train_test_split(
        features,
        target,
        test_size=0.2,
        stratify=target,
        random_state=42,
    )

    model = xgb.XGBClassifier(
        max_depth=4,
        learning_rate=0.1,
        n_estimators=100,
        objective="binary:logistic",
        eval_metric="logloss",
        random_state=42,
    )
    model.fit(x_train, y_train)
    return model


def export_artifacts(model: xgb.XGBClassifier, feature_columns: list[str]) -> None:
    """Persist the trained model and expected feature list for inference."""
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    joblib.dump(model, MODEL_OUTPUT_PATH)
    print(f"Model exported successfully to: {MODEL_OUTPUT_PATH}")

    joblib.dump(feature_columns, FEATURES_OUTPUT_PATH)
    print(f"Expected features exported successfully to: {FEATURES_OUTPUT_PATH}")


def main() -> None:
    """Run the end-to-end training workflow."""
    merged_dataframe = build_training_dataframe()
    features, target = prepare_features_and_target(merged_dataframe)
    model = train_model(features, target)
    export_artifacts(model, features.columns.tolist())


if __name__ == "__main__":
    main()
