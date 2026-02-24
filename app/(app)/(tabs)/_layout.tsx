import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/lib/theme';
import { AppHeader } from '@/components/AppHeader';
import { HeaderMessagesIcon } from '@/components/HeaderMessagesIcon';
import { HeaderNotificationsIcon } from '@/components/HeaderNotificationsIcon';

export default function AppTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          borderTopWidth: 0,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          height: 88,
          paddingTop: 8,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
            },
            android: { elevation: 12 },
          }),
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
        tabBarItemStyle: { paddingVertical: 6 },
        header: () => (
          <AppHeader
            rightElement={
              <View style={headerRightStyles.row}>
                <HeaderNotificationsIcon
                  bookingDetailRoute="/(app)/(tabs)/bookings"
                  conversationRoute="/(app)/(tabs)/messages"
                  bookingsListRoute="/(app)/(tabs)/bookings"
                  messagesListRoute="/(app)/(tabs)/messages"
                />
                <HeaderMessagesIcon messagesRoute="/(app)/(tabs)/messages" />
              </View>
            }
          />
        ),
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <FontAwesome name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <FontAwesome name="th-large" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color }) => <FontAwesome name="ticket" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => <FontAwesome name="envelope" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <FontAwesome name="user" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="auth-debug"
        options={{ href: null }}
      />
    </Tabs>
  );
}

const headerRightStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
