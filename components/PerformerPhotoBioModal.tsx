import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getApiBaseUrl, getAccessToken, apiFetch } from '@/lib/api';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';

type Props = {
  visible: boolean;
  onComplete: () => void;
};

export function PerformerPhotoBioModal({ visible, onComplete }: Props) {
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Please allow access to pictures to continue upload.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setSelectedImageUri(result.assets[0].uri);
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedImageUri) {
      setError('Please add a profile picture to continue.');
      return;
    }
    setError(null);
    setUploading(true);
    const base = getApiBaseUrl();
    const token = await getAccessToken();
    if (!base || !token) {
      setUploading(false);
      setError('Not signed in or API URL not set.');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'android' ? selectedImageUri : selectedImageUri.replace('file://', ''),
        type: 'image/jpeg',
        name: 'photo.jpg',
      } as any);
      const uploadRes = await fetch(`${base}/api/upload/profile-photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) {
        setError((uploadData as { error?: string }).error ?? 'Photo upload failed.');
        setUploading(false);
        return;
      }
      const profileImageUrl = (uploadData as { url?: string }).url;
      if (!profileImageUrl) {
        setError('Photo upload failed.');
        setUploading(false);
        return;
      }
      const patchRes = await apiFetch<{ ok?: boolean }>('/api/performers/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          profileImageUrl,
          ...(bio.trim() ? { bio: bio.trim() } : {}),
        }),
      });
      if (patchRes.error || patchRes.status >= 400) {
        setError(patchRes.error ?? 'Could not save profile.');
        setUploading(false);
        return;
      }
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setUploading(false);
    }
  }, [selectedImageUri, bio, onComplete]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Add profile picture & bio</Text>
        <Text style={styles.subtitle}>
          Add a profile picture (required) and a short bio (optional). You can change these later.
        </Text>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Profile picture (required)</Text>
        <TouchableOpacity style={styles.photoButton} onPress={pickImage} activeOpacity={0.8}>
          {selectedImageUri ? (
            <Image source={{ uri: selectedImageUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>Tap to choose a photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Bio (optional)</Text>
        <TextInput
          style={styles.bioInput}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell customers a bit about yourself and your act..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          numberOfLines={4}
          maxLength={500}
        />
        <Text style={styles.charCount}>{bio.length}/500</Text>

        <TouchableOpacity
          style={[styles.submitButton, (!selectedImageUri || uploading) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!selectedImageUri || uploading}
          activeOpacity={0.8}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={styles.submitButtonText}>Done</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl + 80 },
  title: { ...typography.title, color: colors.foreground, marginBottom: spacing.xs },
  subtitle: { ...typography.bodySmall, color: colors.mutedForeground, marginBottom: spacing.lg },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: { fontSize: 14, color: '#B91C1C' },
  label: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  photoButton: { marginBottom: spacing.lg },
  photoPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: { ...typography.bodySmall, color: colors.mutedForeground },
  previewImage: { width: 160, height: 160, borderRadius: 80 },
  bioInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: 16,
    color: colors.foreground,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: spacing.xs,
  },
  charCount: { ...typography.caption, color: colors.mutedForeground, marginBottom: spacing.lg },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { ...typography.body, fontWeight: '600', color: colors.primaryForeground },
});
