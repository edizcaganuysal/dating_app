import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Match } from '../types';

export default function MatchRevealScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const match: Match = route.params.match;

  return (
    <View style={styles.container}>
      <Text style={styles.celebration}>It's a Match!</Text>

      <View style={styles.profileCard}>
        {match.partner.photo_urls && match.partner.photo_urls.length > 0 ? (
          <Image source={{ uri: match.partner.photo_urls[0] }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Text style={styles.photoInitial}>
              {match.partner.first_name.charAt(0)}
            </Text>
          </View>
        )}
        <Text style={styles.name}>{match.partner.first_name}</Text>
        {match.partner.bio && <Text style={styles.bio}>{match.partner.bio}</Text>}
        {match.partner.program && (
          <Text style={styles.program}>{match.partner.program}</Text>
        )}
      </View>

      <TouchableOpacity
        testID="send-message-button"
        style={styles.primaryButton}
        onPress={() =>
          navigation.replace('ChatDetail', { roomId: match.chat_room_id })
        }
      >
        <Text style={styles.primaryButtonText}>Send a Message</Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="back-home-button"
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.secondaryButtonText}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#fff', justifyContent: 'center',
    alignItems: 'center', padding: 20,
  },
  celebration: {
    fontSize: 32, fontWeight: 'bold', color: '#E91E63', marginBottom: 30,
  },
  profileCard: { alignItems: 'center', marginBottom: 40 },
  photo: { width: 120, height: 120, borderRadius: 60, marginBottom: 16 },
  photoPlaceholder: {
    backgroundColor: '#E91E63', justifyContent: 'center', alignItems: 'center',
  },
  photoInitial: { color: '#fff', fontSize: 48, fontWeight: 'bold' },
  name: { fontSize: 24, fontWeight: '600', marginBottom: 4 },
  bio: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 4, paddingHorizontal: 20 },
  program: { fontSize: 14, color: '#888', marginTop: 4 },
  primaryButton: {
    backgroundColor: '#E91E63', paddingVertical: 14, paddingHorizontal: 40,
    borderRadius: 25, marginBottom: 12, width: '100%', alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: {
    paddingVertical: 14, paddingHorizontal: 40, borderRadius: 25,
    borderWidth: 1, borderColor: '#E91E63', width: '100%', alignItems: 'center',
  },
  secondaryButtonText: { color: '#E91E63', fontSize: 16, fontWeight: '600' },
});
