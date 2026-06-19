import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_URL = 'http://10.0.2.2:8080/api/v1'; // Android emulator to localhost. Change to your backend URL in prod.

export async function uploadImage(localUri: string): Promise<string> {
  const token = await SecureStore.getItemAsync('auth_token');
  if (!token) throw new Error('Not authenticated');

  // Infer the type of the image
  const filename = localUri.split('/').pop() || 'upload.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : `image`;

  const formData = new FormData();
  // @ts-ignore - React Native FormData expects an object with uri, name, and type
  formData.append('file', {
    uri: Platform.OS === 'ios' ? localUri.replace('file://', '') : localUri,
    name: filename,
    type,
  });

  // We use standard fetch here because Axios sometimes struggles with multipart/form-data
  // containing binary files in React Native.
  const response = await fetch(`${API_URL}/media/upload`, {
    method: 'POST',
    body: formData,
    headers: {
      Authorization: `Bearer ${token}`,
      // Do not set Content-Type manually; fetch will set it correctly with the multipart boundary
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Upload failed: ${errorBody}`);
  }

  const data = await response.json();
  return data.url;
}
