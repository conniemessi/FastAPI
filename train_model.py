import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
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

# Create and train the logistic regression model
log_reg = LogisticRegression(random_state=42, max_iter=1000)
log_reg.fit(X_train_scaled, y_train)

# Save scaler parameters
scaler_params = {
    'mean_': scaler.mean_.tolist(),
    'scale_': scaler.scale_.tolist()
}
with open('./static/scaler_params.json', 'w') as f:
    json.dump(scaler_params, f)

# Convert and save model to ONNX
initial_type = [('float_input', FloatTensorType([None, 5]))]
onx = convert_sklearn(log_reg, initial_types=initial_type)

# Set IR version to 7 (widely supported)
onx.ir_version = 7

# Save the model
with open("./static/model.onnx", "wb") as f:
    f.write(onx.SerializeToString())

# Verify the IR version
loaded_model = onnx.load("model.onnx")
print(f"Saved model IR version: {loaded_model.ir_version}")

# Print model performance metrics
from sklearn.metrics import classification_report
y_pred = log_reg.predict(X_test_scaled)
print("\nModel Performance:")
print(classification_report(y_test, y_pred))