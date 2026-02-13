import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const isWeb = Platform.OS === 'web';

const THEME = {
  primary: '#00D4FF',
  secondary: '#7B61FF',
  dark: '#0A0A0F',
  darker: '#050508',
  card: '#12121A',
  border: '#2A2A35',
  text: '#FFFFFF',
  textMuted: '#8B8B9E',
};

interface VideoModalProps {
  visible: boolean;
  onClose: () => void;
  videoUrl?: string;
  videoId?: string;
  title?: string;
  subtitle?: string;
  productColor?: string;
}

export default function VideoModal({ 
  visible, 
  onClose, 
  videoUrl,
  videoId,
  title = 'Product Demo',
  subtitle = 'See how it works',
  productColor = THEME.primary,
}: VideoModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      setIsPlaying(false);
    }
  }, [visible]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  // Get YouTube embed URL from video ID or URL
  const getEmbedUrl = () => {
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
    }
    if (videoUrl?.includes('youtube.com/watch')) {
      const id = videoUrl.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
    }
    if (videoUrl?.includes('youtu.be/')) {
      const id = videoUrl.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
    }
    if (videoUrl?.includes('vimeo.com/')) {
      const id = videoUrl.split('vimeo.com/')[1]?.split('?')[0];
      return `https://player.vimeo.com/video/${id}?autoplay=1`;
    }
    // Direct video URL (mp4, etc.)
    return videoUrl;
  };

  const embedUrl = getEmbedUrl();
  const isYouTubeOrVimeo = embedUrl?.includes('youtube.com/embed') || embedUrl?.includes('vimeo.com');

  if (!isWeb) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={[styles.headerIcon, { backgroundColor: `${productColor}20` }]}>
                <Ionicons name="play-circle" size={24} color={productColor} />
              </View>
              <View>
                <Text style={styles.headerTitle}>{title}</Text>
                <Text style={styles.headerSubtitle}>{subtitle}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.closeBtn} 
              onPress={onClose}
              data-testid="video-modal-close"
            >
              <Ionicons name="close" size={24} color={THEME.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Video Container */}
          <View style={styles.videoContainer}>
            {!isPlaying ? (
              // Thumbnail/Play Button State
              <TouchableOpacity 
                style={styles.playOverlay}
                onPress={() => setIsPlaying(true)}
                data-testid="video-play-btn"
              >
                <LinearGradient
                  colors={[`${productColor}30`, `${productColor}10`]}
                  style={styles.playGradient}
                >
                  <View style={[styles.playButton, { backgroundColor: productColor }]}>
                    <Ionicons name="play" size={40} color={THEME.text} />
                  </View>
                  <Text style={styles.playText}>Click to Play Demo</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              // Video Player
              <>
                {isLoading && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={productColor} />
                    <Text style={styles.loadingText}>Loading video...</Text>
                  </View>
                )}
                
                {isYouTubeOrVimeo ? (
                  <iframe
                    src={embedUrl}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      display: isLoading ? 'none' : 'block',
                    }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    onLoad={handleIframeLoad}
                  />
                ) : embedUrl ? (
                  <video
                    src={embedUrl}
                    style={{
                      width: '100%',
                      height: '100%',
                      display: isLoading ? 'none' : 'block',
                    }}
                    controls
                    autoPlay
                    onLoadedData={handleIframeLoad}
                  />
                ) : (
                  <View style={styles.noVideoContainer}>
                    <Ionicons name="videocam-off-outline" size={64} color={THEME.textMuted} />
                    <Text style={styles.noVideoText}>Demo video coming soon</Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Footer with features */}
          <View style={styles.footer}>
            <View style={styles.footerFeature}>
              <Ionicons name="time-outline" size={16} color={productColor} />
              <Text style={styles.footerFeatureText}>2-3 min watch</Text>
            </View>
            <View style={styles.footerFeature}>
              <Ionicons name="checkmark-circle-outline" size={16} color={productColor} />
              <Text style={styles.footerFeatureText}>Full walkthrough</Text>
            </View>
            <View style={styles.footerFeature}>
              <Ionicons name="sparkles-outline" size={16} color={productColor} />
              <Text style={styles.footerFeatureText}>Key features</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 900,
    backgroundColor: THEME.card,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: THEME.textMuted,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.darker,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: THEME.darker,
    position: 'relative',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  playText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.darker,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: THEME.textMuted,
  },
  noVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  noVideoText: {
    fontSize: 16,
    color: THEME.textMuted,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 24,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  footerFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerFeatureText: {
    fontSize: 13,
    color: THEME.textMuted,
  },
});
