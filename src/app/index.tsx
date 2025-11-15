import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAllMovies, initializeDatabase, MovieRecord } from "../db";

export default function Page() {
  const { top, bottom } = useSafeAreaInsets();
  const [movies, setMovies] = useState<MovieRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const bootstrap = async () => {
      try {
        await initializeDatabase();
        const data = await getAllMovies();
        if (isMounted) {
          setMovies(data);
        }
      } catch (error) {
        console.error("Failed to load movies", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    bootstrap();
    return () => {
      isMounted = false;
    };
  }, []);

  const renderItem = useCallback<ListRenderItem<MovieRecord>>(
    ({ item }) => <MovieListItem movie={item} />,
    [],
  );

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: top + 12, paddingBottom: bottom + 12 },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Movie Watchlist</Text>
        <Text style={styles.headerSubtitle}>
          Theo dõi phim cần xem và đã xem của bạn.
        </Text>
      </View>

      <FlatList
        data={movies}
        keyExtractor={(item) => `${item.id}`}
        renderItem={renderItem}
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
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
});
