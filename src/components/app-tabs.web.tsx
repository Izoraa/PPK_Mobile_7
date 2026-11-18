import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, useColorScheme, View, StyleSheet } from 'react-native';

import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useApp } from '@/state/AppContext';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export default function AppTabs() {
  const { currentUser } = useApp();

  return (
    <Tabs>
      <TabSlot style={{ height: '100%', paddingBottom: 88 }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton iconName={{ web: 'home' }}>Beranda</TabButton>
          </TabTrigger>
          <TabTrigger name="attendance" href="/attendance" asChild>
            <TabButton iconName={{ web: 'checklist' }}>Presensi</TabButton>
          </TabTrigger>
          {currentUser?.role === 'student' && (
            <TabTrigger name="attendance-history" href="/attendance-history" asChild>
              <TabButton iconName={{ web: 'history' }}>Riwayat</TabButton>
            </TabTrigger>
          )}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

type TabButtonProps = TabTriggerSlotProps & {
  iconName: SymbolViewProps['name'];
};

export function TabButton({ children, isFocused, ref: _ref, iconName, ...props }: TabButtonProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <Pressable
      {...props}
      style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}
    >
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}>
        <SymbolView
          name={iconName}
          tintColor={isFocused ? colors.text : colors.textSecondary}
          size={18}
        />
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    zIndex: 10,
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    alignItems: 'center',
    flexDirection: 'column',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.three,
  },
});
