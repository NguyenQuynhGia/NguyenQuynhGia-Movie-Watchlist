import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItem,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { addMovie, getAllMovies, initializeDatabase, MovieRecord } from "../db";

type FormState = {
  title: string;
  year: string;
  rating: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

export default function Page() {
  const { top, bottom } = useSafeAreaInsets();
  const isMountedRef = useRef(true);
  const [movies, setMovies] = useState<MovieRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [formValues, setFormValues] = useState<FormState>({
    title: "",
    year: "",
    rating: "",
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const resetForm = useCallback(() => {
    setFormValues({
      title: "",
      year: "",
      rating: "",
    });
  }, []);

  const loadMovies = useCallback(async () => {
    try {
      const data = await getAllMovies();
      if (isMountedRef.current) {
        setMovies(data);
      }
    } catch (error) {
      console.error("Failed to load movies", error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await initializeDatabase();
        await loadMovies();
      } catch (error) {
        console.error("Failed to initialize database", error);
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    bootstrap();
  }, [loadMovies]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadMovies();
  }, [loadMovies]);

  const renderItem = useCallback<ListRenderItem<MovieRecord>>(
    ({ item }) => <MovieListItem movie={item} />,
    [],
  );

  const openAddModal = useCallback(() => {
    resetForm();
    setFormErrors({});
    setSubmitting(false);
    setAddModalVisible(true);
  }, [resetForm]);

  const closeAddModal = useCallback(() => {
    setAddModalVisible(false);
    setFormErrors({});
    resetForm();
    setSubmitting(false);
  }, [resetForm]);

  const updateFormValue = useCallback((field: keyof FormState, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleSubmitNewMovie = useCallback(async () => {
    const trimmedTitle = formValues.title.trim();
    const trimmedYear = formValues.year.trim();
    const trimmedRating = formValues.rating.trim();
    const currentYear = new Date().getFullYear();
    const nextErrors: FormErrors = {};

    if (!trimmedTitle) {
      nextErrors.title = "Tiêu đề không được để trống.";
    }

    let parsedYear: number | null = null;
    if (trimmedYear) {
      const numericYear = Number(trimmedYear);
      if (Number.isNaN(numericYear)) {
        nextErrors.year = "Năm phát hành phải là số.";
      } else if (numericYear < 1900 || numericYear > currentYear) {
        nextErrors.year = `Năm nằm trong khoảng 1900 - ${currentYear}.`;
      } else {
        parsedYear = numericYear;
      }
    }

    let parsedRating: number | null = null;
    if (trimmedRating) {
      const numericRating = Number(trimmedRating);
      if (Number.isNaN(numericRating)) {
        nextErrors.rating = "Đánh giá phải là số.";
      } else if (numericRating < 1 || numericRating > 5) {
        nextErrors.rating = "Đánh giá nằm trong khoảng 1-5.";
      } else {
        parsedRating = numericRating;
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      return;
    }

    try {
      setSubmitting(true);
      await addMovie({
        title: trimmedTitle,
        year: parsedYear,
        rating: parsedRating,
      });
      await loadMovies();
      closeAddModal();
    } catch (error) {
      console.error("Failed to add movie", error);
    } finally {
      setSubmitting(false);
    }
  }, [closeAddModal, formValues, loadMovies]);

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: top + 12, paddingBottom: bottom + 12 },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTextWrapper}>
            <Text style={styles.headerTitle}>Movie Watchlist</Text>
            <Text style={styles.headerSubtitle}>
              Theo dõi phim cần xem và đã xem của bạn.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={openAddModal}
            accessibilityRole="button"
            accessibilityLabel="Thêm phim mới"
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={movies}
        keyExtractor={(item) => `${item.id}`}
        renderItem={renderItem}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={[
          styles.listContent,
          movies.length === 0 ? styles.listEmptyContent : null,
        ]}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#1f2937" />
              <Text style={styles.emptyStateText}>Đang tải danh sách...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Chưa có phim nào trong danh sách.
              </Text>
            </View>
          )
        }
      />

      <AddMovieModal
        visible={isAddModalVisible}
        onClose={closeAddModal}
        onSubmit={handleSubmitNewMovie}
        formValues={formValues}
        onChange={updateFormValue}
        errors={formErrors}
        submitting={submitting}
      />
    </View>
  );
}

function MovieListItem({ movie }: { movie: MovieRecord }) {
  const statusLabel = movie.watched ? "Đã xem" : "Chưa xem";
  const ratingLabel =
    movie.rating !== null ? `Đánh giá: ${movie.rating}/5` : "Chưa đánh giá";

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{movie.title}</Text>
        {movie.year ? <Text style={styles.cardYear}>({movie.year})</Text> : null}
      </View>
      <View style={styles.cardFooter}>
        <Text
          style={[
            styles.statusBadge,
            movie.watched ? styles.statusWatched : styles.statusPlanned,
          ]}
        >
          {statusLabel}
        </Text>
        <Text style={styles.ratingText}>{ratingLabel}</Text>
      </View>
    </View>
  );
}

type AddModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  submitting: boolean;
  formValues: FormState;
  onChange: (field: keyof FormState, value: string) => void;
  errors: FormErrors;
};

function AddMovieModal({
  visible,
  onClose,
  onSubmit,
  submitting,
  formValues,
  onChange,
  errors,
}: AddModalProps) {
  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalBackdrop}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Thêm phim mới</Text>
          <View style={styles.modalField}>
            <Text style={styles.modalLabel}>Tiêu đề *</Text>
            <TextInput
              style={[styles.input, errors.title ? styles.inputError : undefined]}
              placeholder="Nhập tên phim"
              value={formValues.title}
              onChangeText={(text) => onChange("title", text)}
            />
            {errors.title ? (
              <Text style={styles.errorText}>{errors.title}</Text>
            ) : null}
          </View>

          <View style={styles.modalField}>
            <Text style={styles.modalLabel}>Năm</Text>
            <TextInput
              style={[styles.input, errors.year ? styles.inputError : undefined]}
              placeholder="Ví dụ: 2014"
              value={formValues.year}
              onChangeText={(text) => onChange("year", text)}
              keyboardType="number-pad"
            />
            {errors.year ? (
              <Text style={styles.errorText}>{errors.year}</Text>
            ) : null}
          </View>

          <View style={styles.modalField}>
            <Text style={styles.modalLabel}>Đánh giá (1-5)</Text>
            <TextInput
              style={[
                styles.input,
                errors.rating ? styles.inputError : undefined,
              ]}
              placeholder="Ví dụ: 4"
              value={formValues.rating}
              onChangeText={(text) => onChange("rating", text)}
              keyboardType="number-pad"
            />
            {errors.rating ? (
              <Text style={styles.errorText}>{errors.rating}</Text>
            ) : null}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalCancel]}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={styles.modalCancelText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.modalSubmit,
                submitting ? styles.modalButtonDisabled : undefined,
              ]}
              onPress={onSubmit}
              disabled={submitting}
            >
              <Text style={styles.modalSubmitText}>
                {submitting ? "Đang lưu..." : "Thêm phim"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerTextWrapper: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#4b5563",
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1d4ed8",
  },
  addButtonText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    lineHeight: 28,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  listEmptyContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  card: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
    shadowColor: "#111827",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  cardTitle: {
    flexShrink: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  cardYear: {
    fontSize: 14,
    color: "#6b7280",
  },
  cardFooter: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "600",
    overflow: "hidden",
    color: "#111827",
  },
  statusPlanned: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
  statusWatched: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  ratingText: {
    fontSize: 12,
    color: "#4b5563",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyStateText: {
    marginTop: 12,
    textAlign: "center",
    color: "#4b5563",
    fontSize: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalContainer: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: "#fff",
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    color: "#111827",
  },
  modalField: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#111827",
  },
  inputError: {
    borderColor: "#f87171",
  },
  errorText: {
    marginTop: 4,
    color: "#b91c1c",
    fontSize: 12,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  modalCancel: {
    backgroundColor: "#e5e7eb",
  },
  modalCancelText: {
    color: "#1f2937",
    fontWeight: "600",
  },
  modalSubmit: {
    backgroundColor: "#1d4ed8",
  },
  modalSubmitText: {
    color: "#fff",
    fontWeight: "700",
  },
  modalButtonDisabled: {
    opacity: 0.7,
  },
});
