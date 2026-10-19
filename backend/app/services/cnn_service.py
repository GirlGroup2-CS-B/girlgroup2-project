import numpy as np
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.preprocessing import image
from tensorflow.keras.models import Model

class CNNService:
    def __init__(self):
        # Load MobileNetV2 pre-trained on ImageNet
        base_model = MobileNetV2(weights='imagenet', include_top=False, input_shape=(224, 224, 3))
        
        # We want the output of the global average pooling layer (1D feature vector)
        self.model = Model(inputs=base_model.input, outputs=tf.keras.layers.GlobalAveragePooling2D()(base_model.output))
        
        # We don't want to train the model, just use it to extract features
        self.model.trainable = False

    def extract_features(self, img_path):
        try:
            # 1. Load and resize the image
            img = image.load_img(img_path, target_size=(224, 224))
            
            # 2. Convert image to numpy array
            img_array = image.img_to_array(img)
            
            # 3. Expand dimensions to match model input (1, 224, 224, 3)
            img_array = np.expand_dims(img_array, axis=0)
            
            # 4. Preprocess the image (scales pixel values to [-1, 1])
            img_array = preprocess_input(img_array)
            
            # 5. Get the feature vector from the model
            features = self.model.predict(img_array)
            
            # 6. Flatten the array to a 1D vector
            features = features.flatten()
            
            # 7. Normalize the vector (L2 normalization) 
            norm = np.linalg.norm(features)
            if norm == 0:
                return features
            return features / norm
            
        except Exception as e:
            print(f"Error extracting features: {e}")
            return None