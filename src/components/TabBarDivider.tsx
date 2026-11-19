import { StyleSheet, View } from 'react-native';

/** Visible separator and shadow immediately above the native tab bar. */
export function TabBarDivider() {
  return <View pointerEvents="none" style={styles.divider} />;
}

const styles = StyleSheet.create({
  divider: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    height: 1,
    backgroundColor: '#CBD5E1',
    shadowColor: '#0F172A',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: -3 },
    elevation: 8,
    zIndex: 10,
  },
});
