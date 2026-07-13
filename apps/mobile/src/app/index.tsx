import * as Device from 'expo-device';
import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>BusanFit</Text>
      <Text style={styles.description}>부산 여행 일정 진단기</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  description: {
    marginTop: 12,
    fontSize: 16,
  },
});