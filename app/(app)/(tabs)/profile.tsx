import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Alert, Platform } from 'react-native';
import { useRouter, Link } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { getApiBaseUrl, getAccessToken } from '@/lib/api';
import { colors, spacing, typography } from '@/lib/theme';

export default function ProfileTab() {
  const { user, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickAndUploadPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photos to upload a profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const uri = asset.uri;
    setUploading(true);
    try {
      const base = getApiBaseUrl();
      const token = await getAccessToken();
      if (!base || !token) {
        Alert.alert('Error', 'API URL or session not configured.');
        return;
      }
      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
        type: 'image/jpeg',
        name: 'photo.jpg',
      } as any);
      const res = await fetch(`${base}/api/upload/profile-photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert('Upload failed', (data as { error?: string }).error ?? 'Please try again.');
        return;
      }
      const url = (data as { url?: string }).url;
      if (url) setPhotoUrl(url);
      await refreshProfile();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Account</Text>
      {user && (
        <View style={styles.card}>
          {(photoUrl || user.performerProfile?.profileImageUrl) ? (
            <Image
              source={{ uri: photoUrl ?? (user.performerProfile as { profileImageUrl?: string } | null)?.profileImageUrl ?? '' }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}
          <TouchableOpacity
            style={[styles.uploadButton, uploading && styles.buttonDisabled]}
            onPress={pickAndUploadPhoto}
            disabled={uploading}
          >
            <Text style={styles.uploadButtonText}>{uploading ? 'Uploading…' : 'Upload profile photo'}</Text>
          </TouchableOpacity>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{user.name || '—'}</Text>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user.email}</Text>
          <Text style={styles.label}>Role</Text>
          <Text style={styles.value}>{user.role}</Text>
        </View>
      )}
      {__DEV__ && (
        <Link href="/(app)/(tabs)/auth-debug" asChild>
          <TouchableOpacity style={styles.devLink}>
            <Text style={styles.linkText}>Auth debug (dev)</Text>
          </TouchableOpacity>
        </Link>
      )}
      <TouchableOpacity style={styles.button} onPress={() => signOut().then(() => router.replace('/'))}>
        <Text style={styles.buttonText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { ...typography.title, color: colors.foreground, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: spacing.md },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.muted, marginBottom: spacing.md },
  uploadButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  buttonDisabled: { opacity: 0.7 },
  uploadButtonText: { color: colors.primaryForeground, fontSize: 14, fontWeight: '600' },
  label: { fontSize: 12, color: colors.mutedForeground, marginBottom: 4 },
  value: { fontSize: 16, color: colors.foreground, marginBottom: spacing.md },
  button: {
    backgroundColor: colors.destructive,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  devLink: { marginBottom: spacing.md },
  linkText: { color: colors.primary, fontSize: 14 },
});
