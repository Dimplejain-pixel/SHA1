
"""
Smart Health Assistant — ML Training Pipeline

Entry point for training and evaluating the symptom classifier.
"""

import sys
import logging
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from ml.trainer import train_model

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)

logger = logging.getLogger("train")


def main():
    logger.info("=" * 60)
    logger.info("SMART HEALTH ASSISTANT — TRAINING PIPELINE")
    logger.info("=" * 60)

    try:
        logger.info("Starting model training...")

        metadata = train_model()

        logger.info("=" * 60)
        logger.info("TRAINING COMPLETED SUCCESSFULLY")
        logger.info("=" * 60)

        logger.info("Accuracy:  %.4f", metadata["accuracy"])
        logger.info("Precision: %.4f", metadata["precision"])
        logger.info("Recall:    %.4f", metadata["recall"])
        logger.info("F1-score:  %.4f", metadata["f1_score"])
        logger.info("Classes:   %d", metadata["n_classes"])
        logger.info("Training samples: %d", metadata["train_samples"])
        logger.info("Testing samples:  %d", metadata["test_samples"])

        logger.info("Model saved at: %s", metadata["model_path"])
        logger.info("Metadata saved at: %s", metadata["metadata_path"])

    except Exception:
        logger.exception("MODEL TRAINING FAILED")
        raise


if __name__ == "__main__":
    main()
