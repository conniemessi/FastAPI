import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.svm import SVC
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import classification_report, confusion_matrix
import json
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType
import onnx
from sklearn.ensemble import AdaBoostClassifier, ExtraTreesClassifier, BaggingClassifier
from sklearn.neural_network import MLPClassifier
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier

# Read the data
df = pd.read_csv('train.csv')

# Prepare features (X) and target (y)
X = df.drop(['ID', 'is_gitelman'], axis=1)
y = df['is_gitelman']

# Split the data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
positive_cases = X_test[y_test == 1]
print("\nPositive cases in test set (where is_gitelman = 1):")
print(positive_cases)
print(f"\nNumber of positive cases in test set: {len(positive_cases)}")
# Create and fit the scaler
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Create and train multiple models
models = {
    'Random Forest': RandomForestClassifier(n_estimators=10, random_state=42),
    'KNN': KNeighborsClassifier(n_neighbors=5),
    'Decision Tree': DecisionTreeClassifier(random_state=42),
    'SVM': SVC(probability=True, random_state=42),
    'Logistic Regression': LogisticRegression(random_state=42),
    'Gradient Boosting': GradientBoostingClassifier(random_state=42),
    'AdaBoost': AdaBoostClassifier(random_state=42),
    'XGBoost': XGBClassifier(random_state=42),
    'LightGBM': LGBMClassifier(random_state=42),
    'Extra Trees': ExtraTreesClassifier(n_estimators=100, random_state=42),
    'Bagging': BaggingClassifier(random_state=42),
    'Neural Net': MLPClassifier(hidden_layer_sizes=(100, 50), max_iter=500, random_state=42)
}

# Train and evaluate each model
for name, model in models.items():
    print(f"\n=== {name} Classifier ===")
    
    # Train the model
    model.fit(X_train_scaled, y_train)
    
    # Get predictions
    y_pred = model.predict(X_test_scaled)
    y_pred_proba = model.predict_proba(X_test_scaled)
    
    # Print model performance metrics
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    
    # Print feature importance (for models that support it)
    if hasattr(model, 'feature_importances_'):
        feature_importance = pd.DataFrame({
            'feature': X.columns,
            'importance': model.feature_importances_
        })
        print("\nFeature Importance:")
        print(feature_importance.sort_values('importance', ascending=False))
    
# Save the best performing model (you'll need to modify this based on your evaluation)
best_model = models['SVM']  # Change this to your preferred model

# Save scaler parameters
scaler_params = {
    'mean_': scaler.mean_.tolist(),
    'scale_': scaler.scale_.tolist()
}
with open('scaler_params.json', 'w') as f:
    json.dump(scaler_params, f)

# Convert and save model to ONNX
initial_type = [('float_input', FloatTensorType([None, 5]))]
onx = convert_sklearn(best_model, initial_types=initial_type)

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

# Example inputs
example_inputs = [
    np.array([[
        3.1,  # serum_potassium
        94.5, # urine_potassium
        7.48, # PH
        30,   # bicarbonate
        0     # high_blood_pressure
    ]]),
    np.array([[
        3.3,  # serum_potassium
        18,   # urine_potassium
        7.43, # PH
        25,   # bicarbonate
        0     # high_blood_pressure
    ]])
]

# Test predictions for each example input
for i, example_input in enumerate(example_inputs):
    print(f"\n=== Example {i+1} Predictions ===")
    print(f"Input features: {example_input[0]}")
    
    # Scale the input
    example_scaled = scaler.transform(example_input)
    
    # Get predictions from each model
    for name, model in models.items():
        example_prob = model.predict_proba(example_scaled)
        print(f"\n{name} prediction probabilities [Class 0, Class 1]: "
              f"[{example_prob[0][0]:.3f}, {example_prob[0][1]:.3f}]")