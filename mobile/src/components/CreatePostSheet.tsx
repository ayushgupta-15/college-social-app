import React, { forwardRef, useCallback, useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { PostType } from '../services/postsService';

// ── Post type options — matches Figma & backend enum ─────────────────────────

interface PostTypeOption {
  type: PostType;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  accentColor: string;
}

const POST_TYPES: PostTypeOption[] = [
  {
    type: 'general',
    icon: 'create-outline',
    title: 'Text Post',
    subtitle: 'Share your thoughts',
    accentColor: '#5B8BFF',
  },
  {
    type: 'opportunity',
    icon: 'briefcase-outline',
    title: 'Internship Post',
    subtitle: 'Share an opportunity',
    accentColor: '#4FC3F7',
  },
  {
    type: 'announcement',
    icon: 'megaphone-outline',
    title: 'Event Post',
    subtitle: 'Share an event with others',
    accentColor: '#FFB74D',
  },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  onSubmit: (content: string, type: PostType) => Promise<void>;
}

// ── Component ─────────────────────────────────────────────────────────────────

const CreatePostSheet = forwardRef<BottomSheet, Props>(({ onSubmit }, ref) => {
  const snapPoints = useMemo(() => ['60%', '90%'], []);

  const [selectedType, setSelectedType] = React.useState<PostType>('general');
  const [content, setContent]           = React.useState('');
  const [submitting, setSubmitting]     = React.useState(false);

  const selectedOption = POST_TYPES.find((p) => p.type === selectedType)!;

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(content.trim(), selectedType);
      setContent('');
      setSelectedType('general');
      (ref as React.RefObject<BottomSheet>)?.current?.close();
    } finally {
      setSubmitting(false);
    }
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.6}
      />
    ),
    [],
  );

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => (ref as React.RefObject<BottomSheet>)?.current?.close()}
          >
            <Ionicons name="close" size={22} color="#8888AA" />
          </Pressable>
          <Text style={styles.title}>Create Post</Text>
          <Pressable
            style={[styles.postBtn, (!content.trim() || submitting) && styles.postBtnDisabled]}
            onPress={handleSubmit}
            disabled={!content.trim() || submitting}
          >
            <Text style={styles.postBtnText}>{submitting ? '…' : 'Post'}</Text>
          </Pressable>
        </View>

        {/* Post type selector */}
        <View style={styles.typeRow}>
          {POST_TYPES.map((opt) => (
            <Pressable
              key={opt.type}
              style={[
                styles.typeChip,
                selectedType === opt.type && {
                  backgroundColor: `${opt.accentColor}20`,
                  borderColor: opt.accentColor,
                },
              ]}
              onPress={() => setSelectedType(opt.type)}
            >
              <Ionicons
                name={opt.icon}
                size={24}
                color={selectedType === opt.type ? opt.accentColor : '#5A5D7A'}
              />
              <Text
                style={[
                  styles.typeLabel,
                  selectedType === opt.type && { color: opt.accentColor },
                ]}
              >
                {opt.title}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Composer */}
        <View style={styles.composer}>
          <View style={styles.composerAvatar}>
            <Text style={styles.composerAvatarText}>A</Text>
          </View>
          <TextInput
            style={styles.textInput}
            placeholder={`${selectedOption.subtitle}…`}
            placeholderTextColor="#44445A"
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={2000}
            autoFocus
          />
        </View>

        {/* Char count */}
        <Text style={styles.charCount}>{content.length}/2000</Text>

      </BottomSheetView>
    </BottomSheet>
  );
});

export default CreatePostSheet;

// ── Styles ────────────────────────────────────────────────────────────────────

const ACCENT = '#7C6FE0';

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: '#141626',
  },
  handle: {
    backgroundColor: '#3A3A5C',
    width: 40,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 8,
  },
  cancelBtn: {
    color: '#8888AA',
    fontSize: 18,
    padding: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  postBtn: {
    backgroundColor: '#5B8BFF',
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 20,
  },
  postBtnDisabled: {
    backgroundColor: 'rgba(91,139,255,0.3)',
  },
  postBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // ── Type selector ──────────────────────────────────────────────────────────
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeChip: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A4A',
    backgroundColor: '#1A1D2E',
    gap: 6,
  },
  typeLabel: {
    color: '#5A5D7A',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },

  // ── Composer ───────────────────────────────────────────────────────────────
  composer: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  composerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(91, 139, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: '#5B8BFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  composerAvatarText: {
    color: '#5B8BFF',
    fontSize: 14,
    fontWeight: '700',
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
    minHeight: 120,
  },

  // ── Char count ─────────────────────────────────────────────────────────────
  charCount: {
    color: '#44445A',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
});
