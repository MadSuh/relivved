import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  Pressable
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Plus, 
  Camera, 
  Mic, 
  FileText, 
  Settings, 
  ChevronLeft,
  Trash2,
  Edit,
  Video,
  File,
  X,
  Calendar,
  Layers,
  User,
  Play,
  Pause
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

// --- DESIGN TOKENS ---
const COLORS = {
  background: '#FCF9F2',
  surface: '#FFFFFF',
  textHeader: '#3E2723',
  textBody: '#5D4037',
  accent: '#A1887F',
  primary: '#795548',
  secondary: '#D7CCC8',
  danger: '#A64444',
  shadow: 'rgba(0,0,0,0.08)'
};

// --- DATA MOCK ---
const INITIAL_CHAPTERS = [
  { 
    id: '1', 
    title: 'Meine Kindheit', 
    dateRange: '1980 - 1990',
    description: 'Frühe Jahre im Elternhaus',
    icons: ['camera', 'mic'],
    items: [
      { id: 'm1', title: 'Erster Schultag', date: '12.08.1985', type: 'image', description: 'Mit der großen Schultüte', createdAt: '2026-03-22' },
      { id: 'm2', title: 'Mein rotes Dreirad', date: '1982', type: 'text', description: 'War mein ganzer Stolz', createdAt: '2026-03-21' }
    ],
    subChapters: []
  },
  { 
    id: '2', 
    title: 'Schulzeit & Jugend', 
    dateRange: '1990 - 2000',
    description: 'Gymnasium und erste Freunde',
    icons: ['file-text'],
    items: [
      { id: 'm3', title: 'Abschlussball', date: '06.1995', type: 'image', description: 'Im blauen Anzug', createdAt: '2026-03-20' }
    ],
    subChapters: []
  },
];

const DeleteAlert = ({ visible, chapterTitle, onCancel, onDeleteAll, onDeleteKeepContent }) => (
  <Modal visible={visible} transparent={true} animationType="fade">
    <View style={styles.alertOverlay}>
      <View style={styles.alertContainer}>
        <Text style={styles.alertTitle}>"{chapterTitle}" löschen?</Text>
        <Text style={styles.alertMessage}>Wie möchtest du mit diesem Kapitel und dessen Inhalten verfahren?</Text>
        
        <TouchableOpacity style={styles.alertButtonDanger} onPress={onDeleteAll}>
          <Text style={styles.alertButtonText}>Alles löschen</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.alertButtonSecondary} onPress={onDeleteKeepContent}>
          <Text style={styles.alertButtonSecondaryText}>Kapitel löschen, Inhalte behalten</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.alertButtonCancel} onPress={onCancel}>
          <Text style={styles.alertButtonCancelText}>Abbrechen</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const AddContentModal = ({ visible, onClose, onAdd }) => {
  const [step, setStep] = React.useState('type'); // type | source | capture | details | text | voice
  const [type, setType] = React.useState(null);
  const [source, setSource] = React.useState(null);
  const [tempUris, setTempUris] = React.useState([]); // For multi-page scans
  
  // Details state
  const [title, setTitle] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [dateMode, setDateMode] = React.useState('exact');
  const [day, setDay] = React.useState('');
  const [month, setMonth] = React.useState('');
  const [year1, setYear1] = React.useState('');
  const [year2, setYear2] = React.useState('');

  // Voice Recording state
  const [recording, setRecording] = React.useState(null);
  const [recordedUri, setRecordedUri] = React.useState(null);
  const [isRecording, setIsRecording] = React.useState(false);

  const reset = () => {
    setStep('type');
    setType(null);
    setSource(null);
    setTempUris([]);
    setTitle('');
    setDesc('');
    setRecordedUri(null);
    setRecording(null);
    setIsRecording(false);
    onClose();
  };

  const handleYearPick = (val, idx) => {
    if (idx === 1) setYear1(val);
    else setYear2(val);
  };

  // --- SOURCE PICKERS ---
  const launchGallery = async (mediaType = ['images']) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mediaType,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setTempUris(result.assets.map(a => a.uri));
      setStep('details');
    }
  };

  const launchCamera = async (modality = 'photo') => {
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: modality === 'video' ? ['videos'] : ['images'],
      quality: 0.8,
      allowsEditing: modality !== 'scan',
    });
    if (!result.canceled) {
      if (modality === 'scan') {
        const nextUris = [...tempUris, result.assets[0].uri];
        setTempUris(nextUris);
        if (nextUris.length >= 20) setStep('details');
        else {
          Alert.alert('Scan', 'Seite erfolgreich gescannt. Möchtest du noch eine Seite scannen?', [
            { text: 'Nein, fertig', onPress: () => setStep('details') },
            { text: 'Weiter scannen', onPress: () => launchCamera('scan') }
          ]);
        }
      } else {
        setTempUris([result.assets[0].uri]);
        setStep('details');
      }
    }
  };

  const launchDocument = async () => {
    let result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (!result.canceled) {
      setTempUris([result.assets[0].uri]);
      setStep('details');
    }
  };

  // --- RECORDING ---
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Zugriff verweigert', 'Wir brauchen Mikrofon-Zugriff.');
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
    } catch (err) { console.error('Failed to start recording', err); }
  };

  const stopRecording = async () => {
    setRecording(undefined);
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecordedUri(uri);
    setStep('voice_review');
  };

  const handleAdd = () => {
    if (!title.trim()) return Alert.alert('Titel fehlt', 'Bitte gib einen Namen an.');
    let dateStr = '';
    if (dateMode === 'exact') dateStr = `${day}.${month}.${year1}`;
    else if (dateMode === 'month_year') dateStr = `${month}.${year1}`;
    else if (dateMode === 'year') dateStr = year1;
    else dateStr = `${year1} - ${year2}`;

    onAdd({ type, uris: tempUris, uri: recordedUri || tempUris[0], title, description: desc, date: dateStr });
    reset();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={reset}>
      <View style={styles.overlayCentered}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.bottomSheet}>
          <TouchableOpacity style={styles.closeHandle} onPress={reset} />
          
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{
              step === 'type' ? 'Inhalt hinzufügen' : 
              step === 'source' ? `${type.charAt(0).toUpperCase() + type.slice(1)} auswählen` : 
              step === 'details' ? 'Details ergänzen' : 
              step === 'text' ? 'Erinnerung schreiben' : 'Gedanken aufnehmen'
            }</Text>
            <TouchableOpacity onPress={reset}><X size={26} color={COLORS.primary}/></TouchableOpacity>
          </View>

          <ScrollView style={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
            {step === 'type' && (
              <View style={styles.centeredGrid}>
                <View style={styles.gridRow}>
                   <ContentTypeBtn label="Voice" icon={Mic} onPress={() => setStep('voice')} />
                   <ContentTypeBtn label="Datei" icon={File} onPress={() => { setType('file'); setStep('source'); }} />
                   <ContentTypeBtn label="Text" icon={FileText} onPress={() => { setType('text'); setStep('text'); }} />
                </View>
                <View style={[styles.gridRow, { justifyContent: 'center', marginTop: 15 }]}>
                   <ContentTypeBtn label="Bilder" icon={Camera} onPress={() => { setType('image'); setStep('source'); }} />
                   <ContentTypeBtn label="Video" icon={Video} onPress={() => { setType('video'); setStep('source'); }} />
                </View>
              </View>
            )}

            {step === 'source' && (
              <View style={styles.centeredSourceMenu}>
                {type === 'image' && (
                  <>
                    <LargeMenuBtn label="Aus Fotogalerie" icon={Layers} onPress={() => launchGallery(['images'])} />
                    <LargeMenuBtn label="Aus Dateien" icon={File} onPress={launchDocument} />
                    <LargeMenuBtn label="Kamera (Foto)" icon={Camera} onPress={() => launchCamera('photo')} />
                  </>
                )}
                {type === 'video' && (
                  <>
                    <LargeMenuBtn label="Aus Fotogalerie" icon={Layers} onPress={() => launchGallery(['videos'])} />
                    <LargeMenuBtn label="Aus Dateien" icon={File} onPress={launchDocument} />
                  </>
                )}
                {type === 'file' && (
                  <>
                    <LargeMenuBtn label="Aus Ordner" icon={File} onPress={launchDocument} />
                    <LargeMenuBtn label="Dokument scannen" icon={Camera} onPress={() => launchCamera('scan')} />
                  </>
                )}
              </View>
            )}

            {step === 'text' && (
              <View>
                <TextInput 
                  style={styles.textNoteBox} 
                  multiline 
                  placeholder="Gedanken hier aufschreiben..." 
                  onChangeText={setDesc}
                  autoFocus
                />
                <TouchableOpacity style={styles.actionButton} onPress={() => setStep('details')}>
                   <Text style={styles.actionButtonText}>Weiter</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'voice' && (
              <View style={styles.voiceRecordContainer}>
                <View style={styles.recordVisualizer}>
                  <Mic size={48} color={isRecording ? COLORS.danger : COLORS.secondary} />
                  {isRecording && <Text style={styles.recordingTime}>Aufnahme läuft...</Text>}
                </View>
                <TouchableOpacity 
                   style={[styles.recordCircle, isRecording && { backgroundColor: COLORS.danger }]} 
                   onPress={isRecording ? stopRecording : startRecording}
                >
                   {isRecording ? <View style={styles.stopSquare}/> : <View style={styles.recordDot}/>}
                </TouchableOpacity>
              </View>
            )}

            {step === 'voice_review' && (
              <View style={styles.voiceReviewBox}>
                <Text style={styles.reviewTitle}>Aufnahme fertig</Text>
                <TouchableOpacity style={styles.reviewBtn} onPress={() => setStep('details')}>
                   <Text style={styles.reviewBtnText}>Aufnahme speichern</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.reviewBtnSecondary} onPress={() => setStep('voice')}>
                   <Text style={styles.reviewBtnTextSecondary}>Nochmal aufnehmen</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.discardBtn} onPress={reset}>
                   <Text style={styles.discardBtnText}>Verwerfen</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'details' && (
              <View>
                {tempUris.length > 0 && type === 'image' && <Image source={{ uri: tempUris[0] }} style={styles.detailsPreviewImg} />}
                
                <Text style={styles.inputLabel}>Wie soll die Erinnerung heißen?</Text>
                <TextInput style={styles.modalInput} value={title} onChangeText={setTitle} placeholder="z.B. Ein schöner Tag" />

                <Text style={styles.inputLabel}>Wann war das?</Text>
                <View style={styles.dateModeGrid}>
                   <MiniModeBtn label="tt/mm/jjjj" active={dateMode === 'exact'} onPress={() => setDateMode('exact')} />
                   <MiniModeBtn label="mm/jjjj" active={dateMode === 'month_year'} onPress={() => setDateMode('month_year')} />
                   <MiniModeBtn label="jjjj" active={dateMode === 'year'} onPress={() => setDateMode('year')} />
                   <MiniModeBtn label="Range" active={dateMode === 'span'} onPress={() => setDateMode('span')} />
                </View>

                <View style={styles.dateInputs}>
                   {dateMode === 'exact' && <TextInput style={styles.dateSInput} placeholder="TT" keyboardType="numeric" value={day} onChangeText={setDay} maxLength={2} />}
                   {(dateMode === 'exact' || dateMode === 'month_year') && <TextInput style={styles.dateSInput} placeholder="MM" keyboardType="numeric" value={month} onChangeText={setMonth} maxLength={2} />}
                   <TextInput style={styles.dateSInput} placeholder="JJJJ" keyboardType="numeric" value={year1} onChangeText={setYear1} maxLength={4} />
                   {dateMode === 'span' && (
                     <>
                       <Text style={{ marginHorizontal: 10 }}>bis</Text>
                       <TextInput style={styles.dateSInput} placeholder="JJJJ" keyboardType="numeric" value={year2} onChangeText={setYear2} maxLength={4} />
                     </>
                   )}
                </View>

                {type !== 'text' && (
                  <>
                    <Text style={styles.inputLabel}>Kurzbeschreibung (Optional)</Text>
                    <TextInput style={[styles.modalInput, { height: 70 }]} multiline value={desc} onChangeText={setDesc} />
                  </>
                )}

                <TouchableOpacity style={[styles.actionButton, { marginTop: 15 }]} onPress={handleAdd}>
                  <Text style={styles.actionButtonText}>Erinnerung sichern</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const ContentTypeBtn = ({ label, icon: Icon, onPress }) => (
  <TouchableOpacity style={styles.newTypeBtn} onPress={onPress}>
    <View style={styles.typeBtnIcon}>
      <Icon size={28} color={COLORS.primary} strokeWidth={2} />
    </View>
    <Text style={styles.typeBtnLabel}>{label}</Text>
  </TouchableOpacity>
);

const LargeMenuBtn = ({ label, icon: Icon, onPress }) => (
  <TouchableOpacity style={styles.largeMenuBtn} onPress={onPress}>
    <Icon size={24} color={COLORS.primary} />
    <Text style={styles.largeMenuLabel}>{label}</Text>
    <ChevronLeft size={20} color={COLORS.accent} style={{ transform: [{ rotate: '180deg'}] }} />
  </TouchableOpacity>
);

const MiniModeBtn = ({ label, active, onPress }) => (
  <TouchableOpacity style={[styles.miniModeBtn, active && { backgroundColor: COLORS.primary }]} onPress={onPress}>
    <Text style={[styles.miniModeText, active && { color: '#FFF' }]}>{label}</Text>
  </TouchableOpacity>
);

const AddChapterModal = ({ visible, onClose, onAdd }) => {
  const [newTitle, setNewTitle] = React.useState('');

  const handleAdd = () => {
    if (newTitle.trim()) {
      onAdd(newTitle.trim());
      setNewTitle('');
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Neuen Meilenstein setzen</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          
          <TextInput
            style={styles.modalInput}
            placeholder="z.B. Meine Kindheit, Schulzeit..."
            placeholderTextColor={COLORS.accent}
            value={newTitle}
            onChangeText={setNewTitle}
            autoFocus
          />

          <TouchableOpacity 
            style={[styles.actionButton, { marginTop: 10 }]} 
            onPress={handleAdd}
          >
            <Plus size={20} color={COLORS.surface} strokeWidth={3} />
            <Text style={styles.actionButtonText}>Kapitel erstellen</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const EditChapterModal = ({ visible, chapter, onClose, onUpdate }) => {
  const [newTitle, setNewTitle] = React.useState('');
  const [newRange, setNewRange] = React.useState('');
  const [newDesc, setNewDesc] = React.useState('');
  const [bgZoom, setBgZoom] = React.useState(1);
  const [bgX, setBgX] = React.useState(0);
  const [bgY, setBgY] = React.useState(0);

  React.useEffect(() => {
    if (chapter) {
      setNewTitle(chapter.title || '');
      setNewRange(chapter.dateRange || '');
      setNewDesc(chapter.description || '');
      setBgZoom(chapter.bgZoom || 1);
      setBgX(chapter.bgX || 0);
      setBgY(chapter.bgY || 0);
    }
  }, [chapter]);

  const handleUpdate = () => {
    if (newTitle.trim()) {
      onUpdate({ 
        title: newTitle.trim(), 
        dateRange: newRange.trim(), 
        description: newDesc.trim(), 
        bgZoom, 
        bgX, 
        bgY 
      });
      onClose();
    }
  };

  const previewImg = chapter?.items?.find(i => i.type === 'image' && (i.uris?.length > 0 || i.uri));
  const previewImgUri = previewImg ? (previewImg.uris?.[0] || previewImg.uri) : null;

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { maxHeight: height * 0.9 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Kapitel bearbeiten</Text>
            <TouchableOpacity onPress={onClose}><X size={24} color={COLORS.primary}/></TouchableOpacity>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            {previewImgUri && (
              <View style={styles.tuningContainer}>
                  <Text style={styles.inputLabel}>Hintergrund-Ausrichtung</Text>
                  <View style={styles.tuningPreviewBox}>
                      <Image 
                        source={{ uri: previewImgUri }} 
                        style={[styles.tuningPreviewImg, { transform: [{ scale: bgZoom }, { translateX: bgX }, { translateY: bgY }] }]} 
                      />
                      <LinearGradient
                        colors={['rgba(255,255,255,0)', COLORS.surface]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 0.8, y: 0.5 }}
                        style={styles.tileBgOverlay}
                      />
                  </View>
                  <View style={styles.tuningControls}>
                      <ControlRow label="Zoom" val={bgZoom.toFixed(1)} onMinus={() => setBgZoom(Math.max(1, bgZoom-0.1))} onPlus={() => setBgZoom(Math.min(4, bgZoom+0.1))} />
                      <ControlRow label="Position X" val={bgX.toFixed(0)} onMinus={() => setBgX(bgX-5)} onPlus={() => setBgX(bgX+5)} />
                      <ControlRow label="Position Y" val={bgY.toFixed(0)} onMinus={() => setBgY(bgY-5)} onPlus={() => setBgY(bgY+5)} />
                  </View>
              </View>
            )}

            <Text style={styles.inputLabel}>Titel</Text>
            <TextInput style={styles.modalInput} value={newTitle} onChangeText={setNewTitle} />
            <Text style={styles.inputLabel}>Zeitraum</Text>
            <TextInput style={styles.modalInput} value={newRange} onChangeText={setNewRange} placeholder="z.B. 1980 - 1990" />
            <Text style={styles.inputLabel}>Beschreibung</Text>
            <TextInput style={[styles.modalInput, { height: 80 }]} multiline value={newDesc} onChangeText={setNewDesc} />

            <TouchableOpacity style={styles.actionButton} onPress={handleUpdate}>
              <Text style={styles.actionButtonText}>Speichern</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const ControlRow = ({ label, val, onMinus, onPlus }) => (
  <View style={styles.ctrlRow}>
    <Text style={styles.ctrlLabel}>{label}</Text>
    <View style={styles.ctrlButtons}>
       <TouchableOpacity onPress={onMinus} style={styles.miniBtn}><Text style={styles.miniBtnText}>-</Text></TouchableOpacity>
       <Text style={styles.ctrlVal}>{val}</Text>
       <TouchableOpacity onPress={onPlus} style={styles.miniBtn}><Text style={styles.miniBtnText}>+</Text></TouchableOpacity>
    </View>
  </View>
);

const MemoryTile = ({ chapter, onPress, onEdit, onDelete, isSub, onAddSubChapter }) => {
  const findFirstImage = (items) => {
    const imgItem = items?.find(i => i.type === 'image' && (i.uris?.length > 0 || i.uri));
    return imgItem ? (imgItem.uris?.[0] || imgItem.uri) : null;
  };

  const firstImgUri = findFirstImage(chapter.items);
  const contentCount = (chapter.items?.length || 0) + (chapter.subChapters?.length || 0);
  
  const bgScale = chapter.bgZoom || 1;
  const bgX = chapter.bgX || 0;
  const bgY = chapter.bgY || 0;

  return (
    <View style={[styles.tile, isSub && { padding: 15, borderRadius: 16 }]}>
      {firstImgUri && (
        <View style={styles.tileBgContainer}>
          <Image 
             source={{ uri: firstImgUri }} 
             style={[
               styles.tileBgImage, 
               { transform: [{ scale: bgScale }, { translateX: bgX }, { translateY: bgY }] }
             ]} 
          />
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 0.8, y: 0.5 }}
            style={styles.tileBgOverlay}
          />
        </View>
      )}
      <TouchableOpacity 
        style={[styles.tileMainClick, firstImgUri && { backgroundColor: 'transparent' }]} 
        activeOpacity={0.7} 
        onPress={() => onPress(chapter)}
      >
        <View style={styles.tileHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.tileTitle}>{chapter.title}</Text>
            {chapter.dateRange && <Text style={styles.tileDateText}>{chapter.dateRange}</Text>}
            <Text style={styles.tileSubtitle}>{contentCount} Einträge</Text>
          </View>
          <View style={styles.tileIconsRight}>
             <TouchableOpacity style={[styles.circleIconBtn, { marginRight: 8 }]} onPress={() => onEdit(chapter.id)}>
                <Edit size={16} color={COLORS.primary} strokeWidth={2.5} />
             </TouchableOpacity>
             <TouchableOpacity style={styles.circleIconBtn} onPress={() => onDelete(chapter)}>
                <Trash2 size={16} color={COLORS.danger} strokeWidth={2.5} />
             </TouchableOpacity>
          </View>
        </View>
        
        {chapter.description ? (
          <Text style={styles.tileDescPreview} numberOfLines={2}>
            {chapter.description}
          </Text>
        ) : null}
      </TouchableOpacity>

      <View style={styles.tileFooter}>
        <TouchableOpacity style={styles.actionButton} onPress={() => onPress(chapter)}>
          <Plus size={18} color="#FFF" />
          <Text style={styles.actionButtonText}>Inhalt</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.subActionButton]} 
          onPress={() => onAddSubChapter && onAddSubChapter(chapter.id)}
        >
          <Layers size={16} color={COLORS.primary} />
          <Text style={[styles.actionButtonText, styles.subActionButtonText]}>Unterkapitel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const ChapterDetail = ({ chapter, onBack, onAddItem, onDeleteItem, onAddSubChapter, onNavigateSubChapter, onUpdateItem }) => {
  const parseSortDate = (dStr) => {
    if (!dStr) return '0000-00-00';
    // exact: dd.mm.yyyy -> yyyy-mm-dd
    // month_year: mm.yyyy -> yyyy-mm-00
    // year: yyyy -> yyyy-00-00
    // span: yyyy - yyyy -> yyyy-00-00 (start of span)
    const parts = dStr.split(/[.\s-]+/).filter(Boolean);
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    if (parts.length === 2 && parts[0].length === 2) return `${parts[1]}-${parts[0]}-00`;
    if (parts.length === 1 && parts[0].length === 4) return `${parts[0]}-00-00`;
    if (parts.length >= 2 && parts[0].length === 4) return `${parts[0]}-00-00`;
    return dStr;
  };

  const items = [...(chapter.items || [])].sort((a,b) => parseSortDate(b.date).localeCompare(parseSortDate(a.date)));
  const subChapters = chapter.subChapters || [];

  const [viewer, setViewer] = React.useState({ visible: false, uris: [], index: 0 });
  const [playingAudioId, setPlayingAudioId] = React.useState(null);
  const soundRef = React.useRef(null);

  const handleAudioPlay = async (item) => {
    if (playingAudioId === item.id) {
       await soundRef.current.pauseAsync();
       setPlayingAudioId(null);
       return;
    }

    if (soundRef.current) {
       await soundRef.current.unloadAsync();
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: item.uri },
      { shouldPlay: true }
    );
    soundRef.current = sound;
    setPlayingAudioId(item.id);

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) {
        setPlayingAudioId(null);
      }
    });
  };

  React.useEffect(() => {
    return () => {
      if (soundRef.current) soundRef.current.unloadAsync();
    };
  }, []);

  const renderRightActions = (id) => (
    <TouchableOpacity 
      style={styles.swipeDeleteBtn} 
      onPress={() => onDeleteItem(id)}
    >
      <Trash2 size={24} color="#FFF" />
      <Text style={styles.swipeDeleteText}>Löschen</Text>
    </TouchableOpacity>
  );

  const addMoreToItem = async (item) => {
    let result = await ImagePicker.launchImageLibraryAsync({
       mediaTypes: item.type === 'video' ? ['videos'] : ['images'],
       allowsMultipleSelection: true,
       quality: 0.8,
    });
    if (!result.canceled) {
       const nextUris = [...(item.uris || []), ...result.assets.map(a => a.uri)];
       onUpdateItem(item.id, { uris: nextUris });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerIcon}>
          <ChevronLeft size={24} color={COLORS.textHeader} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 15 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{chapter.title}</Text>
          <Text style={styles.headerSubtitle}>{items.length} Einträge, {subChapters.length} Unterkapitel</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* SUB CHAPTERS SECTION */}
        {subChapters.length > 0 && (
          <View style={styles.subChapterContainer}>
            <Text style={styles.sectionTitle}>Unterkapitel</Text>
            {subChapters.map(sub => (
               <MemoryTile 
                 key={sub.id} 
                 chapter={sub} 
                 onPress={() => onNavigateSubChapter(sub)}
                 onEdit={() => {}} 
                 onDelete={() => {}}
                 onAddSubChapter={() => onAddSubChapter(sub.id)}
                 isSub
               />
            ))}
          </View>
        )}

        {/* ITEMS SECTION */}
        {items.length === 0 && subChapters.length === 0 ? (
          <View style={styles.emptyState}>
            <Layers size={48} color={COLORS.secondary} />
            <Text style={styles.emptyStateText}>Noch keine Inhalte oder Unterkapitel vorhanden.</Text>
          </View>
        ) : (
          <View>
            <Text style={styles.sectionTitle}>Erinnerungen (Chronologisch)</Text>
            {items.map(item => {
              const itemUris = item.uris || (item.uri ? [item.uri] : []);
              const isGallery = item.type === 'image' || item.type === 'video';

              return (
                <Swipeable 
                  key={item.id} 
                  renderRightActions={() => renderRightActions(item.id)}
                  friction={2}
                  rightThreshold={40}
                >
                  <View style={styles.memoryItem}>
                    <View style={styles.memoryItemIcon}>
                      {item.type === 'voice' ? (
                        <TouchableOpacity style={styles.circlePlayBtn} onPress={() => handleAudioPlay(item)}>
                           {playingAudioId === item.id ? <Pause size={20} color="#FFF" /> : <Play size={20} color="#FFF" fill="#FFF" />}
                        </TouchableOpacity>
                      ) : (
                        <>
                          {item.type === 'image' && <Camera size={24} color={COLORS.primary} />}
                          {item.type === 'video' && <Video size={24} color={COLORS.primary} />}
                          {item.type === 'file' && <File size={24} color={COLORS.primary} />}
                          {item.type === 'text' && <FileText size={24} color={COLORS.primary} />}
                        </>
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.memoryItemTitle}>{item.title}</Text>
                          <Text style={styles.memoryItemDate}>{item.date}</Text>
                        </View>
                        {item.type === 'voice' && <Mic size={20} color={COLORS.accent} />}
                      </View>
                      
                      {item.description && <Text style={styles.memoryItemDesc} numberOfLines={2}>{item.description}</Text>}
                      
                      {isGallery && itemUris.length > 0 && (
                        <View style={styles.thumbnailRow}>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {itemUris.map((u, idx) => (
                              <TouchableOpacity key={idx} onPress={() => setViewer({ visible: true, uris: itemUris, index: idx })}>
                                <Image source={{ uri: u }} style={styles.itemThumbnail} />
                              </TouchableOpacity>
                            ))}
                            <TouchableOpacity style={styles.addThumbBtn} onPress={() => addMoreToItem(item)}>
                               <Plus size={20} color={COLORS.primary} />
                            </TouchableOpacity>
                          </ScrollView>
                        </View>
                      )}

                      <Text style={styles.memoryItemMeta}>Hinzugefügt: {item.createdAt}</Text>
                    </View>
                  </View>
                </Swipeable>
              );
            })}
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Media Viewer Modal */}
      <Modal visible={viewer.visible} transparent={true} animationType="fade">
         <View style={styles.mediaViewerContainer}>
            <TouchableOpacity style={styles.mediaViewerClose} onPress={() => setViewer({ ...viewer, visible: false })}>
               <X size={32} color="#FFF" />
            </TouchableOpacity>
            <Image source={{ uri: viewer.uris[viewer.index] }} style={styles.fullScreenMedia} resizeMode="contain" />
            
            {viewer.uris.length > 1 && (
              <View style={styles.viewerControls}>
                 <TouchableOpacity onPress={() => setViewer({...viewer, index: Math.max(0, viewer.index-1)})}>
                    <ChevronLeft size={44} color="#FFF" />
                 </TouchableOpacity>
                 <Text style={styles.viewerCounter}>{viewer.index + 1} / {viewer.uris.length}</Text>
                 <TouchableOpacity onPress={() => setViewer({...viewer, index: Math.min(viewer.uris.length-1, viewer.index+1)})}>
                    <ChevronLeft size={44} color="#FFF" style={{ transform: [{ rotate: '180deg'}] }} />
                 </TouchableOpacity>
              </View>
            )}
         </View>
      </Modal>

      {/* SINGLE FAB FOR CHAPTER */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: COLORS.accent, bottom: 40 }]} 
        activeOpacity={0.8}
        onPress={() => onAddItem()}
      >
        <Plus size={32} color="#FFF" strokeWidth={3} />
      </TouchableOpacity>
    </View>
  );
};

export default function App() {
  const [chapters, setChapters] = React.useState([]);
  const [unassignedItems, setUnassignedItems] = React.useState([]);
  const [chapterModal, setChapterModal] = React.useState({ visible: false, editId: null });
  const [contentModalVisible, setContentModalVisible] = React.useState(false);
  const [deleteAlert, setDeleteAlert] = React.useState({ visible: false, chapter: null });
  const [selectedChapter, setSelectedChapter] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const STORAGE_KEY = '@relivve_data';

  // --- PERSISTENCE ---
  const loadData = async () => {
    try {
      const savedData = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const { storedChapters, storedUnassigned } = JSON.parse(savedData);
        setChapters(storedChapters || INITIAL_CHAPTERS);
        setUnassignedItems(storedUnassigned || []);
      } else {
        setChapters(INITIAL_CHAPTERS);
      }
    } catch (e) {
      setChapters(INITIAL_CHAPTERS);
    } finally {
      setIsLoading(false);
    }
  };

  const saveData = async (currentChapters, currentUnassigned) => {
    try {
      const dataToSave = JSON.stringify({ 
        storedChapters: currentChapters, 
        storedUnassigned: currentUnassigned 
      });
      await AsyncStorage.setItem(STORAGE_KEY, dataToSave);
    } catch (e) {
      console.warn('Fehler beim Speichern:', e);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  React.useEffect(() => {
    if (!isLoading) {
      saveData(chapters, unassignedItems);
    }
  }, [chapters, unassignedItems, isLoading]);

  const addNewChapter = (title) => {
    const newCh = {
      id: Math.random().toString(),
      title,
      dateRange: '',
      description: '',
      icons: [],
      items: [],
      subChapters: []
    };
    setChapters([newCh, ...chapters]);
  };

  const deleteChapterRecursive = (list, id) => {
    return list.filter(ch => ch.id !== id).map(ch => {
      if (ch.subChapters?.length > 0) {
        return { ...ch, subChapters: deleteChapterRecursive(ch.subChapters, id) };
      }
      return ch;
    });
  };

  const deleteChapter = (chapterId, keepContent) => {
    const findInTree = (list, id) => {
      for (const ch of list) {
        if (ch.id === id) return ch;
        if (ch.subChapters) {
           const found = findInTree(ch.subChapters, id);
           if (found) return found;
        }
      }
      return null;
    };

    const target = findInTree(chapters, chapterId);
    if (!target) return;

    if (keepContent) {
      setUnassignedItems(prev => [...prev, ...(target.items || [])]);
    }
    setChapters(prev => deleteChapterRecursive(prev, chapterId));
    setDeleteAlert({ visible: false, chapter: null });
  };

  const updateChapterRecursive = (list, id, updates) => {
    return list.map(ch => {
      if (ch.id === id) return { ...ch, ...updates };
      if (ch.subChapters?.length > 0) {
        return { ...ch, subChapters: updateChapterRecursive(ch.subChapters, id, updates) };
      }
      return ch;
    });
  };

  const addItemToChapter = (itemData) => {
    if (!selectedChapter) return;
    const newItem = {
      id: Math.random().toString(),
      ...itemData,
      createdAt: new Date().toLocaleDateString('de-DE')
    };

    setChapters(prev => updateChapterRecursive(prev, selectedChapter.id, {
      items: [newItem, ...(selectedChapter.items || [])]
    }));
    
    setSelectedChapter(prev => ({
      ...prev,
      items: [newItem, ...(prev.items || [])]
    }));
  };

  const deleteItemFromChapter = (itemId) => {
    if (!selectedChapter) return;
    const nextItems = (selectedChapter.items || []).filter(i => i.id !== itemId);
    setChapters(prev => updateChapterRecursive(prev, selectedChapter.id, { items: nextItems }));
    setSelectedChapter(prev => ({ ...prev, items: nextItems }));
  };

  const updateItemInChapter = (itemId, updates) => {
    if (!selectedChapter) return;
    const nextItems = (selectedChapter.items || []).map(i => i.id === itemId ? { ...i, ...updates } : i);
    setChapters(prev => updateChapterRecursive(prev, selectedChapter.id, { items: nextItems }));
    setSelectedChapter(prev => ({ ...prev, items: nextItems }));
  };

  const addSubChapterToCurrent = () => {
    if (!selectedChapter) return;
    const newSub = {
      id: Math.random().toString(),
      title: 'Neues Unterkapitel',
      dateRange: '',
      description: '',
      items: [],
      subChapters: []
    };
    const nextSubs = [...(selectedChapter.subChapters || []), newSub];
    setChapters(prev => updateChapterRecursive(prev, selectedChapter.id, { subChapters: nextSubs }));
    setSelectedChapter(prev => ({ ...prev, subChapters: nextSubs }));
  };

  const [navStack, setNavStack] = React.useState([]);

  const navigateToChapter = (ch) => {
    if (selectedChapter) setNavStack([...navStack, selectedChapter]);
    setSelectedChapter(ch);
  };

  const navigateBack = () => {
    if (navStack.length > 0) {
      const prev = navStack[navStack.length - 1];
      setSelectedChapter(prev);
      setNavStack(navStack.slice(0, -1));
    } else {
      setSelectedChapter(null);
    }
  };

  const findChapterInTree = (list, id) => {
    for (const ch of list) {
      if (ch.id === id) return ch;
      if (ch.subChapters) {
        const found = findChapterInTree(ch.subChapters, id);
        if (found) return found;
      }
    }
    return null;
  };

  const chapterToEdit = chapterModal.editId ? findChapterInTree(chapters, chapterModal.editId) : null;
  const chapterModalTitle = chapterModal.editId ? 'Kapitel bearbeiten' : (chapterModal.parentId ? 'Unterkapitel hinzufügen' : 'Neues Kapitel');

  const handleChapterAction = (val) => {
    if (chapterModal.editId) {
       const uList = updateChapterRecursive(chapters, chapterModal.editId, val);
       setChapters(uList);
       // Also update selected chapter if we are deep in it
       if (selectedChapter && selectedChapter.id === chapterModal.editId) {
         setSelectedChapter({ ...selectedChapter, ...val });
       }
    } else if (chapterModal.parentId) {
       const newSub = {
         id: Math.random().toString(),
         title: val.title || 'Neues Unterkapitel',
         dateRange: val.dateRange || '',
         description: val.description || '',
         items: [],
         subChapters: []
       };
       setChapters(prev => {
         const findAndAdd = (list) => list.map(ch => {
           if (ch.id === chapterModal.parentId) {
             const updated = { ...ch, subChapters: [...(ch.subChapters || []), newSub] };
             // sync selectedChapter if user is CURRENTLY in it
             if (selectedChapter && selectedChapter.id === updated.id) setSelectedChapter(updated);
             return updated;
           }
           if (ch.subChapters) return { ...ch, subChapters: findAndAdd(ch.subChapters) };
           return ch;
         });
         return findAndAdd(prev);
       });
    } else {
       addNewChapter(val.title);
    }
    setChapterModal({ visible: false, editId: null, parentId: null });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        
        {selectedChapter ? (
          <ChapterDetail 
            chapter={selectedChapter} 
            onBack={navigateBack} 
            onAddItem={() => setContentModalVisible(true)}
            onDeleteItem={deleteItemFromChapter}
            onUpdateItem={updateItemInChapter}
            onNavigateSubChapter={navigateToChapter}
            onAddSubChapter={(id) => setChapterModal({ visible: true, editId: null, parentId: id })}
          />
        ) : (
          <>
            <View style={styles.header}>
              <TouchableOpacity style={styles.headerIcon}>
                <User size={23} color={COLORS.textHeader} />
              </TouchableOpacity>
              
              <View style={styles.logoContainer}>
                <Text style={styles.logoText}>Relivve</Text>
              </View>

              <TouchableOpacity style={styles.headerIcon}>
                <Settings size={23} color={COLORS.textHeader} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {chapters.map(chapter => (
                <MemoryTile 
                  key={chapter.id} 
                  chapter={chapter} 
                  onPress={(ch) => navigateToChapter(ch)}
                  onEdit={(id) => setChapterModal({ visible: true, editId: id, parentId: null })}
                  onDelete={(ch) => setDeleteAlert({ visible: true, chapter: ch })}
                  onAddSubChapter={(id) => setChapterModal({ visible: true, editId: null, parentId: id })}
                />
              ))}

              {unassignedItems.length > 0 && (
                <View style={styles.unassignedBox}>
                  <Text style={styles.unassignedTitle}>Nicht zugeordnete Inhalte ({unassignedItems.length})</Text>
                  <TouchableOpacity style={styles.subActionButton}>
                    <Text style={styles.subActionButtonText}>Inhalten zuordnen</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={{ height: 120 }} />
            </ScrollView>

            <TouchableOpacity 
              style={styles.fab} 
              activeOpacity={0.8}
              onPress={() => setChapterModal({ visible: true, editId: null })}
            >
              <Plus size={26} color="#FFF" strokeWidth={3} />
              <Text style={styles.fabText}>Neues Kapitel</Text>
            </TouchableOpacity>
          </>
        )}

        <AddChapterModal 
          visible={chapterModal.visible && !chapterModal.editId} 
          onClose={() => setChapterModal({ visible: false, editId: null, parentId: null })} 
          onAdd={handleChapterAction}
          title={chapterModalTitle}
        />

        <EditChapterModal 
          visible={chapterModal.visible && !!chapterModal.editId}
          chapter={chapterToEdit || {}}
          onClose={() => setChapterModal({ visible: false, editId: null, parentId: null })}
          onUpdate={handleChapterAction}
        />

        <AddContentModal 
          visible={contentModalVisible} 
          onClose={() => setContentModalVisible(false)}
          onAdd={addItemToChapter}
        />

        <DeleteAlert 
          visible={deleteAlert.visible}
          chapterTitle={deleteAlert.chapter?.title}
          onCancel={() => setDeleteAlert({ visible: false, chapter: null })}
          onDeleteAll={() => deleteChapter(deleteAlert.chapter.id, false)}
          onDeleteKeepContent={() => deleteChapter(deleteAlert.chapter.id, true)}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
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
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#100600',
    letterSpacing: -1,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
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
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 30,
    paddingBottom: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textHeader,
  },
  modalCloseText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  modalInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    padding: 18,
    fontSize: 18,
    color: COLORS.textHeader,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    marginTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.accent,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 24,
  },
  detailFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
    paddingTop: 20,
    gap: 20,
  },
  fabSmall: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  memoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  memoryItemIcon: {
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  circlePlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  memoryItemTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textHeader,
  },
  memoryItemDate: {
    fontSize: 13,
    color: COLORS.accent,
    marginTop: 2,
    fontWeight: '500',
  },
  memoryItemDesc: {
    fontSize: 14,
    color: COLORS.textBody,
    marginTop: 4,
    fontStyle: 'italic',
  },
  memoryItemMeta: {
    fontSize: 10,
    color: COLORS.accent,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  itemActions: {
    alignItems: 'center',
    marginLeft: 10,
  },
  miniActionBtn: {
    padding: 8,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  tileMainClick: {
    marginBottom: 15,
  },
  tileIconsRight: {
    flexDirection: 'row',
  },
  circleIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileDateText: {
    fontSize: 13,
    color: COLORS.accent,
    fontWeight: '600',
    marginBottom: 2,
  },
  tileDescPreview: {
    fontSize: 14,
    color: COLORS.textBody,
    marginTop: 8,
    opacity: 0.8,
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  alertTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textHeader,
    textAlign: 'center',
    marginBottom: 10,
  },
  alertMessage: {
    fontSize: 16,
    color: COLORS.textBody,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  alertButtonDanger: {
    backgroundColor: COLORS.danger,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  alertButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  alertButtonSecondary: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  alertButtonSecondaryText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  alertButtonCancel: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  alertButtonCancelText: {
    color: COLORS.accent,
    fontSize: 16,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    justifyContent: 'center',
    paddingTop: 10,
  },
  typeItem: {
    width: '28%',
    aspectRatio: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  typeLabel: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 8,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
    marginTop: 10,
    marginLeft: 5,
  },
  unassignedBox: {
    marginTop: 20,
    padding: 20,
    backgroundColor: COLORS.secondary,
    borderRadius: 20,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  unassignedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  swipeDeleteBtn: {
    backgroundColor: COLORS.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 90,
    borderRadius: 15,
    marginBottom: 12,
  },
  swipeDeleteText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  selectedImagePreview: {
    width: '100%',
    height: 150,
    borderRadius: 20,
    marginBottom: 20,
    resizeMode: 'cover',
  },
  dateModeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  dateModeBtn: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
    alignItems: 'center',
  },
  activeModeBtn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dateModeBtnText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  activeModeBtnText: {
    color: '#FFF',
  },
  dateInputFields: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  smallInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.secondary,
    padding: 12,
    fontSize: 16,
    color: COLORS.textHeader,
    marginRight: 10,
    textAlign: 'center',
    minWidth: 60,
  },
  tinyPreview: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  overlayCentered: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 30,
    maxHeight: height * 0.9,
    paddingBottom: 60,
  },
  closeHandle: {
    width: 50,
    height: 6,
    backgroundColor: COLORS.secondary,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 10,
  },
  centeredGrid: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  newTypeBtn: {
    width: 90,
    alignItems: 'center',
  },
  typeBtnIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.secondary,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  typeBtnLabel: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
  },
  centeredSourceMenu: {
    paddingVertical: 10,
  },
  largeMenuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
  },
  largeMenuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textHeader,
    marginLeft: 15,
  },
  textNoteBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 20,
    fontSize: 18,
    color: COLORS.textHeader,
    height: 250,
    textAlignVertical: 'top',
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
    marginBottom: 20,
  },
  voiceRecordContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  recordVisualizer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  recordingTime: {
    marginTop: 10,
    color: COLORS.danger,
    fontWeight: '700',
  },
  recordCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFF',
  },
  recordDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.danger,
  },
  stopSquare: {
    width: 25,
    height: 25,
    backgroundColor: '#FFF',
    borderRadius: 4,
  },
  voiceReviewBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textHeader,
    marginBottom: 25,
  },
  reviewBtn: {
    backgroundColor: COLORS.primary,
    width: '100%',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  reviewBtnSecondary: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    width: '100%',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewBtnTextSecondary: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  discardBtn: {
    padding: 12,
  },
  discardBtnText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: '600',
  },
  detailsPreviewImg: {
    width: '100%',
    height: 180,
    borderRadius: 20,
    marginBottom: 15,
  },
  dateModeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  miniModeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.secondary,
    backgroundColor: COLORS.surface,
  },
  miniModeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  dateInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dateSInput: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.secondary,
    textAlign: 'center',
    fontSize: 16,
    marginRight: 8,
    minWidth: 55,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 15,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subChapterContainer: {
    marginBottom: 30,
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: 15,
    borderRadius: 24,
  },
  tileBgContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: -1,
  },
  tileBgImage: {
    width: '100%',
    height: '100%',
    opacity: 0.4,
  },
  tileBgOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  tuningContainer: {
    marginBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: 15,
    borderRadius: 15,
  },
  tuningPreviewBox: {
    width: '100%',
    height: 120,
    backgroundColor: '#000',
    borderRadius: 15,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 15,
  },
  tuningPreviewImg: {
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  tuningControls: {
    gap: 10,
  },
  ctrlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctrlLabel: {
    fontSize: 14,
    color: COLORS.textBody,
    fontWeight: '600',
  },
  ctrlButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  miniBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniBtnText: {
    fontSize: 18,
    color: COLORS.primary,
    fontWeight: '700',
  },
  ctrlVal: {
    minWidth: 35,
    textAlign: 'center',
    fontWeight: '700',
    color: COLORS.primary,
  },
  thumbnailRow: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 8,
  },
  itemThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: COLORS.secondary,
  },
  addThumbBtn: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  mediaViewerContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaViewerClose: {
    position: 'absolute',
    top: 60,
    right: 30,
    zIndex: 10,
  },
  fullScreenMedia: {
    width: '100%',
    height: '100%',
  },
  viewerControls: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 40,
  },
  viewerCounter: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  }
});
