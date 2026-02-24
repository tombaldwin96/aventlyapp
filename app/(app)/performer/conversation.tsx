import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';

type Message = {
  id: string;
  body: string;
  senderUserId: string;
  senderName: string | null;
  createdAt: string;
};

type ConversationData = {
  conversation: { id: string; otherName: string | null; eventName: string | null };
  messages: Message[];
};

export default function ConversationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = React.useState<ConversationData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [reply, setReply] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const flatListRef = useRef<FlatList>(null);
  const { user } = useAuth();

  const fetchConversation = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const res = await apiFetch<ConversationData>(`/api/messages/conversations/${id}`);
    setData(res.data ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

  const sendMessage = useCallback(async () => {
    const text = reply.trim();
    if (!id || !text || sending) return;
    setSending(true);
    const res = await apiFetch<{ id: string; body: string; createdAt: string }>(`/api/messages/conversations/${id}`, {
      method: 'POST',
      body: JSON.stringify({ body: text }),
    });
    setSending(false);
    if (res.data) {
      setReply('');
      setData((prev) =>
        prev
          ? {
              ...prev,
              messages: [
                ...prev.messages,
                {
                  id: res.data!.id,
                  body: res.data!.body,
                  senderUserId: user?.id ?? '',
                  senderName: user?.name ?? null,
                  createdAt: res.data!.createdAt,
                },
              ],
            }
          : null
      );
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [id, reply, sending, user?.id, user?.name]);

  if (loading || !data) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderItem = ({ item }: { item: Message }) => {
    const isMe = item.senderUserId === user?.id;
    return (
      <View style={[styles.messageBubble, isMe ? styles.messageMe : styles.messageThem]}>
        <Text style={[styles.messageBody, isMe && styles.messageBodyMe]}>{item.body}</Text>
        <Text style={[styles.messageMeta, isMe && styles.messageMetaMe]}>
          {item.senderName ?? 'User'} · {new Date(item.createdAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      <TouchableOpacity style={[styles.back, { paddingTop: insets.top + spacing.xs }]} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{data.conversation.otherName ?? 'Conversation'}</Text>
      {data.conversation.eventName && (
        <Text style={styles.headerSub}>{data.conversation.eventName}</Text>
      )}
      <FlatList
        ref={flatListRef}
        data={data.messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: spacing.md }]}
        ListEmptyComponent={<Text style={styles.empty}>No messages yet. Send one below.</Text>}
      />
      <View style={[styles.inputRow, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TextInput
          style={styles.input}
          placeholder="Type a message…"
          placeholderTextColor={colors.mutedForeground}
          value={reply}
          onChangeText={setReply}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!reply.trim() || sending) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!reply.trim() || sending}
        >
          <Text style={styles.sendBtnText}>{sending ? '…' : 'Send'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  back: { paddingHorizontal: spacing.lg },
  backText: { ...typography.body, color: colors.primary },
  headerTitle: { ...typography.headline, color: colors.foreground, paddingHorizontal: spacing.lg, marginTop: spacing.xs },
  headerSub: { ...typography.bodySmall, color: colors.mutedForeground, paddingHorizontal: spacing.lg },
  list: { padding: spacing.lg, flexGrow: 1 },
  empty: { ...typography.bodySmall, color: colors.mutedForeground, textAlign: 'center', marginTop: spacing.lg },
  messageBubble: { maxWidth: '85%', padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.sm },
  messageMe: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  messageThem: { alignSelf: 'flex-start', backgroundColor: colors.muted },
  messageBody: { ...typography.body, color: colors.foreground },
  messageBodyMe: { color: colors.primaryForeground },
  messageMeta: { ...typography.caption, color: colors.mutedForeground, marginTop: spacing.xs },
  messageMetaMe: { color: 'rgba(255,255,255,0.8)' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginRight: spacing.sm, maxHeight: 100, ...typography.body },
  sendBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.md, justifyContent: 'center', minHeight: 44 },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { ...typography.body, fontWeight: '600', color: colors.primaryForeground },
});
