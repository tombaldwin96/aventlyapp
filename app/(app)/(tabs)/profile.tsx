import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Alert, Platform, ActivityIndicator } from 'react-native';
import { useRouter, Link } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '@/contexts/AuthContext';
import { getApiBaseUrl, getAccessToken, apiFetch, deleteAccount } from '@/lib/api';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';

export default function ProfileTab() {
  const { user, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete my account',
      'This will permanently delete your account and all associated data. This cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete my account',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const res = await deleteAccount();
            setDeleting(false);
            if (res.error) {
              Alert.alert(res.status === 404 ? 'Not available' : 'Error', res.error);
              return;
            }
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const pickAndUploadPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to pictures to continue upload.');
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
          <TouchableOpacity
            onPress={pickAndUploadPhoto}
            disabled={uploading}
            activeOpacity={0.8}
            style={styles.avatarTouchable}
          >
            {(photoUrl || (user.performerProfile as { profileImageUrl?: string } | null)?.profileImageUrl) ? (
              <Image
                source={{ uri: photoUrl ?? (user.performerProfile as { profileImageUrl?: string } | null)?.profileImageUrl ?? '' }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder} />
            )}
            {uploading && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
            {!uploading && (
              <View style={styles.avatarEditBadge}>
                <FontAwesome name="camera" size={16} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
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
      <TouchableOpacity style={styles.button} onPress={() => signOut().then(() => router.replace('/(auth)/login'))}>
        <Text style={styles.buttonText}>Sign out</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDeleteAccount}
        disabled={deleting}
      >
        {deleting ? (
          <ActivityIndicator size="small" color={colors.mutedForeground} />
        ) : (
          <Text style={styles.deleteButtonText}>Delete my account</Text>
        )}
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
  avatarTouchable: { marginBottom: spacing.md, alignSelf: 'flex-start' },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.muted },
  avatarOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: 80,
  },
  avatarEditBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
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
  deleteButton: {
    marginTop: spacing.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteButtonText: { fontSize: 16, fontWeight: '600', color: colors.mutedForeground },
  devLink: { marginBottom: spacing.md },
  linkText: { color: colors.primary, fontSize: 14 },
});
