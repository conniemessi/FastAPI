import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
import json
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType
import onnx

# Read the data
df = pd.read_csv('train.csv')

# Prepare features (X) and target (y)
X = df.drop(['ID', 'is_gitelman'], axis=1)
y = df['is_gitelman']

# Split the data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Create and fit the scaler
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Create and train the random forest model
rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
rf_model.fit(X_train_scaled, y_train)

# Get predictions and probabilities
y_pred = rf_model.predict(X_test_scaled)
y_pred_proba = rf_model.predict_proba(X_test_scaled)

# Print predictions for first 10 test samples
print("\nPredictions for first 10 samples:")
print("True labels:", y_test.iloc[:10].values)
print("Predicted labels:", y_pred[:10])
print("Prediction probabilities [Class 0, Class 1]:")
for proba in y_pred_proba[:10]:
    print(f"[{proba[0]:.3f}, {proba[1]:.3f}]")

# Print feature importance
feature_importance = pd.DataFrame({
    'feature': X.columns,
    'importance': rf_model.feature_importances_
})
print("\nFeature Importance:")
print(feature_importance.sort_values('importance', ascending=False))

# Print model performance metrics
from sklearn.metrics import classification_report, confusion_matrix
print("\nClassification Report:")
print(classification_report(y_test, y_pred))

print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))

# Save scaler parameters
scaler_params = {
    'mean_': scaler.mean_.tolist(),
    'scale_': scaler.scale_.tolist()
}
with open('scaler_params.json', 'w') as f:
    json.dump(scaler_params, f)

# Convert and save model to ONNX
initial_type = [('float_input', FloatTensorType([None, 5]))]
onx = convert_sklearn(rf_model, initial_types=initial_type)

# Set IR version to 7 (widely supported)
onx.ir_version = 7

# Save the model
with open("model.onnx", "wb") as f:
    f.write(onx.SerializeToString())

# Verify the IR version
loaded_model = onnx.load("model.onnx")
print(f"\nSaved model IR version: {loaded_model.ir_version}")

# Print versions for debugging
import onnxruntime
print(f"ONNX version: {onnx.__version__}")
print(f"ONNX Runtime version: {onnxruntime.__version__}")

# Example of how to use the model for a single prediction
example_input = np.array([[
    3.5,  # serum_potassium
    62.7, # urine_potassium
    7.472,# PH
    23.1, # bicarbonate
    0     # high_blood_pressure
]])
example_scaled = scaler.transform(example_input)
example_prob = rf_model.predict_proba(example_scaled)
print("\nExample prediction for single input:")
print("Input features:", example_input[0])
print("Prediction probabilities [Class 0, Class 1]:", [f"{prob:.3f}" for prob in example_prob[0]])