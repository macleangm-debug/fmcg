import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CartItem as CartItemType } from '../store/cartStore';
import { useBusinessStore } from '../store/businessStore';

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}

export default function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const { formatCurrency } = useBusinessStore();
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [inputQuantity, setInputQuantity] = useState(item.quantity.toString());

  // Safe format currency function
  const safeFormatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) {
      return formatCurrency(0);
    }
    return formatCurrency(value);
  };

  const handleQuantitySubmit = () => {
    const qty = parseInt(inputQuantity, 10);
    if (!isNaN(qty) && qty > 0) {
      onUpdateQuantity(qty);
    } else if (qty === 0 || inputQuantity === '') {
      onRemove();
    }
    setShowQuantityModal(false);
  };

  const openQuantityModal = () => {
    setInputQuantity(item.quantity.toString());
    setShowQuantityModal(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="cube-outline" size={24} color="#9CA3AF" />
          </View>
        )}
      </View>
      
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>{item.product_name}</Text>
        <Text style={styles.price}>{safeFormatCurrency(item.unit_price)} each</Text>
        
        <View style={styles.quantityRow}>
          <View style={styles.quantityControls}>
            <TouchableOpacity 
              style={styles.quantityButton}
              onPress={() => onUpdateQuantity(item.quantity - 1)}
            >
              <Ionicons name="remove" size={18} color="#374151" />
            </TouchableOpacity>
            
            {/* Tappable quantity that opens input modal */}
            <TouchableOpacity onPress={openQuantityModal} style={styles.quantityTouchable}>
              <Text style={styles.quantity}>{item.quantity}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quantityButton}
              onPress={() => onUpdateQuantity(item.quantity + 1)}
            >
              <Ionicons name="add" size={18} color="#374151" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.subtotal}>{safeFormatCurrency(item.subtotal)}</Text>
        </View>
      </View>
      
      <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
        <Ionicons name="trash-outline" size={20} color="#DC2626" />
      </TouchableOpacity>

      {/* Quantity Input Modal */}
      <Modal
        visible={showQuantityModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQuantityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Quantity</Text>
            <Text style={styles.modalSubtitle}>{item.product_name}</Text>
            
            <TextInput
              style={styles.quantityInput}
              value={inputQuantity}
              onChangeText={setInputQuantity}
              keyboardType="number-pad"
              autoFocus
              selectTextOnFocus
              placeholder="0"
              placeholderTextColor="#9CA3AF"
            />
            
            {/* Quick quantity buttons */}
            <View style={styles.quickButtons}>
              {[5, 10, 20, 50, 100].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={styles.quickButton}
                  onPress={() => setInputQuantity(num.toString())}
                >
                  <Text style={styles.quickButtonText}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowQuantityModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleQuantitySubmit}
              >
                <Text style={styles.confirmButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  imageContainer: {
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  price: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityTouchable: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    minWidth: 40,
  },
  quantity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  subtotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
  },
  removeButton: {
    padding: 8,
    marginLeft: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  quantityInput: {
    width: '100%',
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  quickButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  quickButton: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  quickButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
