import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Bin } from 'utils/types';

interface ZoomState {
  // Zoom level (1.0 = show all, 2.0 = show half, etc.)
  level: number;
  // Center position (0-1, where 0.5 is center)
  center: number;
  // Number of visible bins (calculated from zoom level)
  visibleBinCount: number;
}

interface ZoomControls {
  // Current zoom state
  zoomState: ZoomState;

  // Visible bins after zoom/pan
  visibleBins: Bin[];

  // Zoom actions
  zoomIn: (factor?: number) => void;
  zoomOut: (factor?: number) => void;
  zoomToLevel: (level: number) => void;
  zoomToFit: () => void;
  zoomToSelection: (startIndex: number, endIndex: number) => void;
  resetZoom: () => void;

  // Pan actions
  pan: (deltaX: number) => void;
  panToCenter: (centerRatio: number) => void;
  panToBin: (binId: number) => void;

  // Interaction handlers
  handleWheel: (event: React.WheelEvent) => void;
  handleTouchStart: (event: React.TouchEvent) => void;
  handleTouchMove: (event: React.TouchEvent) => void;
  handleTouchEnd: (event: React.TouchEvent) => void;
  handleMouseDown: (event: React.MouseEvent) => void;
  handleMouseMove: (event: React.MouseEvent) => void;
  handleMouseUp: (event: React.MouseEvent) => void;
  handleKeyDown: (event: React.KeyboardEvent) => void;

  // Utility values
  zoomPercentage: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  canPanLeft: boolean;
  canPanRight: boolean;

  // Selection state
  isSelecting: boolean;
  selectionStart: number | null;
  selectionEnd: number | null;
}

interface UseZoomControlsOptions {
  bins: Bin[];
  activeId?: number;
  minZoom?: number;
  maxZoom?: number;
  initialViewportRatio?: number;
  zoomSensitivity?: number;
  panSensitivity?: number;
  enableTouchZoom?: boolean;
  enableWheelZoom?: boolean;
  enableDragSelection?: boolean;
  enableKeyboardShortcuts?: boolean;
}

export const useZoomControls = ({
  bins,
  activeId,
  minZoom = 0.1,
  maxZoom = 10,
  initialViewportRatio = 0.3,
  zoomSensitivity = 0.1,
  panSensitivity = 0.05,
  enableTouchZoom = true,
  enableWheelZoom = true,
  enableDragSelection = true,
  enableKeyboardShortcuts = true
}: UseZoomControlsOptions): ZoomControls => {
  // Find active bin index for centering
  const activeBinIndex = useMemo(() => {
    if (!activeId || !bins.length) return Math.floor(bins.length / 2);
    const index = bins.findIndex((bin) => bin.id === activeId);
    return index !== -1 ? index : Math.floor(bins.length / 2);
  }, [bins, activeId]);

  // Initialize zoom state with safe defaults that will be updated when bins load
  const [zoomState, setZoomState] = useState<ZoomState>(() => ({
    level: 1,
    center: 0.5,
    visibleBinCount: 20 // Default fallback
  }));

  // Debug logging
  console.log('🎯 useZoomControls Debug:', {
    totalBins: bins.length,
    activeBinIndex,
    zoomState,
    visibleBinsCalculated: Math.max(
      1,
      Math.min(bins.length, zoomState.visibleBinCount)
    )
  });

  // Touch/gesture state
  const [touchState, setTouchState] = useState<{
    isActive: boolean;
    initialDistance: number;
    initialZoom: number;
    touches: TouchList | null;
  }>({
    isActive: false,
    initialDistance: 0,
    initialZoom: 1,
    touches: null
  });

  // Selection state
  const [selectionState, setSelectionState] = useState<{
    isActive: boolean;
    startIndex: number | null;
    endIndex: number | null;
    startX: number | null;
  }>({
    isActive: false,
    startIndex: null,
    endIndex: null,
    startX: null
  });

  // Mouse drag state
  const [dragState, setDragState] = useState<{
    isActive: boolean;
    startX: number;
    initialCenter: number;
  }>({
    isActive: false,
    startX: 0,
    initialCenter: 0.5
  });

  // Refs for DOM interactions
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible bins based on current zoom state
  const visibleBins = useMemo(() => {
    if (!bins.length) {
      console.log('⚠️ No bins available');
      return [];
    }

    const totalBins = bins.length;
    const viewWidth = Math.max(
      1,
      Math.min(totalBins, zoomState.visibleBinCount)
    );

    // Calculate start index based on center position
    const centerIndex = Math.floor(zoomState.center * totalBins);
    const halfWidth = Math.floor(viewWidth / 2);

    let startIndex = Math.max(0, centerIndex - halfWidth);
    const endIndex = Math.min(totalBins - 1, startIndex + viewWidth - 1);

    // Adjust if we hit the end boundary
    if (endIndex === totalBins - 1 && startIndex > 0) {
      startIndex = Math.max(0, endIndex - viewWidth + 1);
    }

    // Ensure we have the right amount of bins
    const actualBins = bins.slice(startIndex, endIndex + 1);

    console.log('📏 Visible bins calculation:', {
      totalBins,
      requestedViewWidth: zoomState.visibleBinCount,
      actualViewWidth: viewWidth,
      centerIndex,
      halfWidth,
      startIndex,
      endIndex,
      sliceLength: endIndex - startIndex + 1,
      actualBinsLength: actualBins.length,
      zoomState
    });

    return actualBins;
  }, [bins, zoomState.center, zoomState.visibleBinCount]);

  // Update zoom state when bins are loaded or active bin changes
  useEffect(() => {
    if (bins.length > 0) {
      const newCenter =
        activeBinIndex >= 0 ? activeBinIndex / bins.length : 0.5;
      const newVisibleBinCount = Math.max(
        5, // Minimum 5 bins
        Math.min(bins.length, Math.floor(bins.length * initialViewportRatio))
      );
      const newLevel = bins.length / newVisibleBinCount;

      console.log('🔄 Updating zoom state:', {
        binsLength: bins.length,
        activeBinIndex,
        newCenter,
        newVisibleBinCount,
        newLevel,
        initialViewportRatio
      });

      setZoomState((prev) => ({
        ...prev,
        center: newCenter,
        visibleBinCount: newVisibleBinCount,
        level: newLevel
      }));
    }
  }, [bins, activeBinIndex, initialViewportRatio]); // Depend on bins array, not just length

  // Zoom functions
  const zoomIn = useCallback(
    (factor: number = 1 + zoomSensitivity) => {
      setZoomState((prev) => {
        const newLevel = Math.min(maxZoom, prev.level * factor);
        const newVisibleBinCount = Math.max(
          1,
          Math.floor(bins.length / newLevel)
        );
        return {
          ...prev,
          level: newLevel,
          visibleBinCount: newVisibleBinCount
        };
      });
    },
    [maxZoom, zoomSensitivity, bins.length]
  );

  const zoomOut = useCallback(
    (factor: number = 1 + zoomSensitivity) => {
      setZoomState((prev) => {
        const newLevel = Math.max(minZoom, prev.level / factor);
        const newVisibleBinCount = Math.min(
          bins.length,
          Math.floor(bins.length / newLevel)
        );
        return {
          ...prev,
          level: newLevel,
          visibleBinCount: newVisibleBinCount
        };
      });
    },
    [minZoom, zoomSensitivity, bins.length]
  );

  const zoomToLevel = useCallback(
    (level: number) => {
      setZoomState((prev) => {
        const clampedLevel = Math.max(minZoom, Math.min(maxZoom, level));
        const newVisibleBinCount = Math.max(
          1,
          Math.min(bins.length, Math.floor(bins.length / clampedLevel))
        );
        return {
          ...prev,
          level: clampedLevel,
          visibleBinCount: newVisibleBinCount
        };
      });
    },
    [minZoom, maxZoom, bins.length]
  );

  const zoomToFit = useCallback(() => {
    setZoomState({
      level: 1,
      center: 0.5,
      visibleBinCount: bins.length
    });
  }, [bins.length]);

  const zoomToSelection = useCallback(
    (startIndex: number, endIndex: number) => {
      if (startIndex >= endIndex || !bins.length) return;

      const selectionWidth = endIndex - startIndex + 1;
      const newLevel = bins.length / selectionWidth;
      const newCenter = (startIndex + endIndex) / 2 / bins.length;

      setZoomState({
        level: Math.max(minZoom, Math.min(maxZoom, newLevel)),
        center: newCenter,
        visibleBinCount: selectionWidth
      });
    },
    [bins.length, minZoom, maxZoom]
  );

  const resetZoom = useCallback(() => {
    const resetVisibleBinCount = Math.max(
      5,
      Math.min(bins.length, Math.floor(bins.length * initialViewportRatio))
    );
    const resetLevel = bins.length / resetVisibleBinCount;

    setZoomState({
      level: resetLevel,
      center: bins.length > 0 ? activeBinIndex / bins.length : 0.5,
      visibleBinCount: resetVisibleBinCount
    });
  }, [bins.length, activeBinIndex, initialViewportRatio]);

  // Pan functions
  const pan = useCallback(
    (deltaX: number) => {
      setZoomState((prev) => {
        const newCenter = prev.center + deltaX * panSensitivity;
        return {
          ...prev,
          center: Math.max(0, Math.min(1, newCenter))
        };
      });
    },
    [panSensitivity, bins.length]
  );

  const panToCenter = useCallback((centerRatio: number) => {
    setZoomState((prev) => ({
      ...prev,
      center: Math.max(0, Math.min(1, centerRatio))
    }));
  }, []);

  const panToBin = useCallback(
    (binId: number) => {
      const binIndex = bins.findIndex((bin) => bin.id === binId);
      if (binIndex !== -1) {
        panToCenter(binIndex / bins.length);
      }
    },
    [bins, panToCenter]
  );

  // Interaction handlers
  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      if (!enableWheelZoom) return;

      event.preventDefault();

      if (event.deltaY < 0) {
        zoomIn();
      } else {
        zoomOut();
      }
    },
    [enableWheelZoom, zoomIn, zoomOut]
  );

  const getTouchDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (!enableTouchZoom || event.touches.length < 2) return;

      const distance = getTouchDistance(event.touches);
      setTouchState({
        isActive: true,
        initialDistance: distance,
        initialZoom: zoomState.level,
        touches: event.touches
      });
    },
    [enableTouchZoom, zoomState.level]
  );

  const handleTouchMove = useCallback(
    (event: React.TouchEvent) => {
      if (!touchState.isActive || event.touches.length < 2) return;

      event.preventDefault();
      const currentDistance = getTouchDistance(event.touches);
      const scaleChange = currentDistance / touchState.initialDistance;
      const newZoom = touchState.initialZoom * scaleChange;

      zoomToLevel(newZoom);
    },
    [touchState, zoomToLevel]
  );

  const handleTouchEnd = useCallback(() => {
    setTouchState({
      isActive: false,
      initialDistance: 0,
      initialZoom: 1,
      touches: null
    });
  }, []);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (!enableDragSelection) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;

      if (event.shiftKey) {
        // Start selection
        setSelectionState({
          isActive: true,
          startIndex: null,
          endIndex: null,
          startX: x
        });
      } else {
        // Start drag pan
        setDragState({
          isActive: true,
          startX: x,
          initialCenter: zoomState.center
        });
      }
    },
    [enableDragSelection, zoomState.center]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (selectionState.isActive) {
        // Handle selection
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        // Update selection state based on mouse position
        // This would need chart width and conversion logic
      } else if (dragState.isActive) {
        // Handle drag pan
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const deltaX = (x - dragState.startX) / rect.width;

        setZoomState((prev) => ({
          ...prev,
          center: Math.max(0, Math.min(1, dragState.initialCenter - deltaX))
        }));
      }
    },
    [selectionState, dragState]
  );

  const handleMouseUp = useCallback(() => {
    if (
      selectionState.isActive &&
      selectionState.startIndex !== null &&
      selectionState.endIndex !== null
    ) {
      zoomToSelection(selectionState.startIndex, selectionState.endIndex);
    }

    setSelectionState({
      isActive: false,
      startIndex: null,
      endIndex: null,
      startX: null
    });

    setDragState({
      isActive: false,
      startX: 0,
      initialCenter: 0.5
    });
  }, [selectionState, zoomToSelection]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!enableKeyboardShortcuts) return;

      switch (event.key) {
        case '+':
        case '=':
          event.preventDefault();
          zoomIn();
          break;
        case '-':
          event.preventDefault();
          zoomOut();
          break;
        case '0':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            resetZoom();
          }
          break;
        case 'f':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            zoomToFit();
          }
          break;
        case 'ArrowLeft':
          event.preventDefault();
          pan(-1);
          break;
        case 'ArrowRight':
          event.preventDefault();
          pan(1);
          break;
      }
    },
    [enableKeyboardShortcuts, zoomIn, zoomOut, resetZoom, zoomToFit, pan]
  );

  // Utility values - calculate percentage based on how much we're zoomed in
  const zoomPercentage = Math.round(
    ((zoomState.level - 1) / (maxZoom - 1)) * 100
  );
  const canZoomIn = zoomState.level < maxZoom;
  const canZoomOut = zoomState.level > minZoom;
  const canPanLeft = zoomState.center > 0;
  const canPanRight = zoomState.center < 1;

  return {
    zoomState,
    visibleBins,
    zoomIn,
    zoomOut,
    zoomToLevel,
    zoomToFit,
    zoomToSelection,
    resetZoom,
    pan,
    panToCenter,
    panToBin,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleKeyDown,
    zoomPercentage,
    canZoomIn,
    canZoomOut,
    canPanLeft,
    canPanRight,
    isSelecting: selectionState.isActive,
    selectionStart: selectionState.startIndex,
    selectionEnd: selectionState.endIndex
  };
};
