import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar,
  Dimensions
} from 'react-native';
import { 
  Plus, 
  Camera, 
  Mic, 
  FileText, 
  Settings, 
  ChevronRight
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

// --- DESIGN TOKENS ---
const COLORS = {
  background: '#FCF9F2', // Warm, off-white
  surface: '#FFFFFF',
  textHeader: '#3E2723', // Dark Coffee
  textBody: '#5D4037',   // Medium Brown
  accent: '#A1887F',     // Soft Taupe
  primary: '#795548',    // Earthy Brown
  secondary: '#D7CCC8',  // Light Beige
  shadow: 'rgba(0,0,0,0.08)'
};

// --- DATA MOCK ---
const INITIAL_CHAPTERS = [
  { id: '1', title: 'Meine Kindheit', contentCount: 12, icons: ['camera', 'mic'] },
  { id: '2', title: 'Schulzeit & Jugend', contentCount: 8, icons: ['file-text'] },
  { id: '3', title: 'Die erste eigene Wohnung', contentCount: 5, icons: ['camera'] },
  { id: '4', title: 'Reisen & Abenteuer', contentCount: 15, icons: ['camera', 'mic', 'file-text'] },
];

const MemoryTile = ({ chapter }) => {
  return (
    <View style={styles.tile}>
      <View style={styles.tileHeader}>
        <View>
          <Text style={styles.tileTitle}>{chapter.title}</Text>
          <Text style={styles.tileSubtitle}>{chapter.contentCount} Erinnerungen</Text>
        </View>
        <TouchableOpacity style={styles.iconButton}>
          <ChevronRight size={20} color={COLORS.primary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <View style={styles.tileContent}>
        <View style={styles.mediaRow}>
           {chapter.icons.includes('camera') && <Camera size={18} color={COLORS.accent} style={styles.mediaIcon} />}
           {chapter.icons.includes('mic') && <Mic size={18} color={COLORS.accent} style={styles.mediaIcon} />}
           {chapter.icons.includes('file-text') && <FileText size={18} color={COLORS.accent} style={styles.mediaIcon} />}
        </View>
      </View>

      <View style={styles.tileFooter}>
        <TouchableOpacity style={styles.actionButton}>
          <Plus size={16} color={COLORS.surface} strokeWidth={3} />
          <Text style={styles.actionButtonText}>Inhalt hinzufügen</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.actionButton, styles.subActionButton]}>
          <Text style={[styles.actionButtonText, styles.subActionButtonText]}>Kapitel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Relivve</Text>
          <Text style={styles.headerSubtitle}>Dein Lebensarchiv</Text>
        </View>
        <TouchableOpacity style={styles.headerIcon}>
          <Settings size={24} color={COLORS.textHeader} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {INITIAL_CHAPTERS.map(chapter => (
          <MemoryTile key={chapter.id} chapter={chapter} />
        ))}

        {/* REFILL SPACE */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FLOAT ACTION BUTTON */}
      <TouchableOpacity style={styles.fab}>
        <Plus size={28} color="#FFF" strokeWidth={3} />
        <Text style={styles.fabText}>Neues Kapitel</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: COLORS.background,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.textHeader,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.accent,
    marginTop: -2,
  },
  headerIcon: {
    padding: 8,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  tile: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  tileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tileTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.textHeader,
  },
  tileSubtitle: {
    fontSize: 14,
    color: COLORS.accent,
    marginTop: 4,
  },
  iconButton: {
    padding: 6,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
  },
  tileContent: {
    marginTop: 15,
    marginBottom: 20,
  },
  mediaRow: {
    flexDirection: 'row',
  },
  mediaIcon: {
    marginRight: 12,
  },
  tileFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  subActionButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
  },
  subActionButtonText: {
    color: COLORS.primary,
    marginLeft: 0,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  fabText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  }
});
