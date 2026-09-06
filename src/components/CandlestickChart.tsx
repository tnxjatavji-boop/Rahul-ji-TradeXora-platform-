import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Trade, useAppContext } from '../context/AppContext';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { CandleData, getCandleSeries, getTimeFrameMs, getPrecision } from '../utils/candleStore';
import { formatTimeInTz } from '../utils/timezone';
import { DrawingItem, DrawingToolType, ChartPoint } from '../types/analysis';
import { DrawingToolsBar } from './analysis/DrawingToolsBar';
import { SelectedDrawingToolbar } from './analysis/SelectedDrawingToolbar';

export type { CandleData };

interface CandlestickChartProps {
  assetId?: string;
  assetSymbol?: string;
  assetName?: string;
  currentPrice: number;
  timeFrame?: string;
  chartType?: 'area' | 'candle' | 'bars' | 'heikin';
  activeTrades?: Trade[];
  theme?: 'light' | 'dark';
  isLoading?: boolean;
  onTradeSignal?: (direction: 'CALL' | 'PUT') => void;
}

// Distance helper: Point to Segment distance in pixels
function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

export const CandlestickChart: React.FC<CandlestickChartProps> = React.memo(({
  assetId = '1',
  assetSymbol = '',
  assetName = 'Asset',
  currentPrice,
  timeFrame = '1m',
  chartType = 'candle',
  activeTrades = [],
  theme = 'light',
  isLoading = false,
}) => {
  const { selectedTimezone } = useAppContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [dimensions, setDimensions] = useState({ width: 400, height: 380 });
  const [hoveredCandle, setHoveredCandle] = useState<CandleData | null>(null);
  const [candleCountdown, setCandleCountdown] = useState<number>(15);
  const [chartReady, setChartReady] = useState(false);

  // Zoom & 4-Directional Pan state
  const [visibleCount, setVisibleCount] = useState<number>(32);
  const [panOffset, setPanOffset] = useState<number>(0);
  const [priceScaleMultiplier, setPriceScaleMultiplier] = useState<number>(1.0);
  const [priceCenterShift, setPriceCenterShift] = useState<number>(0);

  // Drawing Tools & Movable State
  const [activeDrawingTool, setActiveDrawingTool] = useState<DrawingToolType>('none');
  const [magnetMode, setMagnetMode] = useState<boolean>(() => {
    return localStorage.getItem('chart_magnet_mode') === 'true';
  });
  const [hideAllDrawings, setHideAllDrawings] = useState<boolean>(false);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [inProgressPoints, setInProgressPoints] = useState<ChartPoint[]>([]);

  // Persistent Drawings
  const [drawings, setDrawings] = useState<DrawingItem[]>(() => {
    try {
      const saved = localStorage.getItem(`chart_drawings_${assetId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save drawings per asset
  useEffect(() => {
    try {
      localStorage.setItem(`chart_drawings_${assetId}`, JSON.stringify(drawings));
    } catch {}
  }, [drawings, assetId]);

  // Load asset drawings on switch
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`chart_drawings_${assetId}`);
      setDrawings(saved ? JSON.parse(saved) : []);
      setSelectedDrawingId(null);
      setInProgressPoints([]);
      setActiveDrawingTool('none');
    } catch {
      setDrawings([]);
    }
  }, [assetId]);

  // Interaction tracking state ref
  const interactionRef = useRef<{
    mode: 'none' | 'pan' | 'price_scale' | 'time_scale' | 'drag_drawing' | 'drag_handle' | 'brush';
    startX: number;
    startY: number;
    startPanOffset: number;
    startPriceScale: number;
    startPriceShift: number;
    startVisibleCount: number;
    hoverX: number | null;
    hoverY: number | null;
    hoverCursor: string;
    
    // Dragging drawing data
    dragDrawingId: string | null;
    dragHandleIndex: number | null; // 0, 1, 2, or null for entire body
    startPoints: ChartPoint[];
    startMousePrice: number;
    startMouseTime: number;
  }>({
    mode: 'none',
    startX: 0,
    startY: 0,
    startPanOffset: 0,
    startPriceScale: 1.0,
    startPriceShift: 0,
    startVisibleCount: 32,
    hoverX: null,
    hoverY: null,
    hoverCursor: 'crosshair',
    dragDrawingId: null,
    dragHandleIndex: null,
    startPoints: [],
    startMousePrice: 0,
    startMouseTime: 0,
  });

  const [cursorStyle, setCursorStyle] = useState<string>('crosshair');

  const touchStateRef = useRef<{
    mode: 'none' | 'pan' | 'price_scale' | 'drag_drawing' | 'drag_handle';
    startX: number;
    startY: number;
    startPanOffset: number;
    startPriceScale: number;
    startPriceShift: number;
    initialPinchDistance: number | null;
    startVisibleCount: number;
    dragDrawingId: string | null;
    dragHandleIndex: number | null;
    startPoints: ChartPoint[];
    startMousePrice: number;
    startMouseTime: number;
  }>({
    mode: 'none',
    startX: 0,
    startY: 0,
    startPanOffset: 0,
    startPriceScale: 1.0,
    startPriceShift: 0,
    initialPinchDistance: null,
    startVisibleCount: 32,
    dragDrawingId: null,
    dragHandleIndex: null,
    startPoints: [],
    startMousePrice: 0,
    startMouseTime: 0,
  });

  const rafRef = useRef<number | null>(null);

  // Resize Observer
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        if (clientWidth > 50 && clientHeight > 50) {
          setDimensions({
            width: clientWidth,
            height: clientHeight
          });
        }
      }
    };

    updateSize();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      ro = new ResizeObserver(() => updateSize());
      ro.observe(containerRef.current);
    }
    window.addEventListener('resize', updateSize);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Viewport reset on asset or timeframe change
  useEffect(() => {
    setChartReady(false);
    setPanOffset(0);
    setPriceScaleMultiplier(1.0);
    setPriceCenterShift(0);
    const timer = setTimeout(() => setChartReady(true), 60);
    return () => clearTimeout(timer);
  }, [assetId, timeFrame]);

  // Candle Countdown
  useEffect(() => {
    const intervalMs = getTimeFrameMs(timeFrame);
    const updateCountdown = () => {
      const now = Date.now();
      const nextEpoch = Math.floor(now / intervalMs) * intervalMs + intervalMs;
      const remainingSec = Math.max(0, Math.ceil((nextEpoch - now) / 1000));
      setCandleCountdown(remainingSec);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [timeFrame]);

  // Layout Dimensions
  const priceAxisWidth = 62;
  const timeAxisHeight = 22;
  const mainPlotWidth = Math.max(dimensions.width - priceAxisWidth, 80);
  const mainPlotHeight = Math.max(dimensions.height - timeAxisHeight, 80);

  // Coordinate Converters
  const getCoordinatesMapper = useCallback((
    candles: CandleData[],
    safeOffset: number,
    yMin: number,
    yRange: number
  ) => {
    const extraRightSlots = safeOffset < 0 ? Math.abs(safeOffset) + 3 : 3;
    const totalSlots = candles.length + extraRightSlots;
    const slotWidth = mainPlotWidth / Math.max(1, totalSlots);

    const getXForTime = (time: number): number => {
      if (candles.length === 0) return 0;
      for (let i = 0; i < candles.length; i++) {
        if (candles[i].time === time) {
          return i * slotWidth + slotWidth / 2;
        }
      }
      const firstTime = candles[0].time;
      const interval = getTimeFrameMs(timeFrame);
      const diffFromFirst = (time - firstTime) / Math.max(1, interval);
      return diffFromFirst * slotWidth + slotWidth / 2;
    };

    const getYForPrice = (price: number): number => {
      const ratio = (price - yMin) / (yRange || 1);
      return mainPlotHeight - ratio * mainPlotHeight;
    };

    const getPriceFromY = (y: number): number => {
      const ratio = (mainPlotHeight - y) / (mainPlotHeight || 1);
      return yMin + ratio * yRange;
    };

    const getTimeFromX = (x: number): number => {
      if (candles.length === 0) return Date.now();
      const idx = Math.floor(x / slotWidth);
      if (idx >= 0 && idx < candles.length) {
        return candles[idx].time;
      }
      if (idx >= candles.length) {
        const extraCandles = idx - (candles.length - 1);
        const lastTime = candles[candles.length - 1].time;
        return lastTime + extraCandles * getTimeFrameMs(timeFrame);
      }
      const firstTime = candles[0].time;
      return firstTime + idx * getTimeFrameMs(timeFrame);
    };

    return { getXForTime, getYForPrice, getPriceFromY, getTimeFromX, slotWidth };
  }, [mainPlotWidth, mainPlotHeight, timeFrame]);

  // Current Window Data Helper
  const getWindowData = useCallback(() => {
    const rawSeries = getCandleSeries(assetId, currentPrice || 2499.07, timeFrame);
    if (!rawSeries || rawSeries.length === 0) return null;

    const count = Math.min(visibleCount, rawSeries.length);
    const maxOffset = Math.max(0, rawSeries.length - count);
    const minOffset = -12;
    const safeOffset = Math.min(Math.max(minOffset, panOffset), maxOffset);

    const endIndex = Math.min(rawSeries.length, Math.max(count, rawSeries.length - Math.max(0, safeOffset)));
    const startIndex = Math.max(0, endIndex - count);
    const candles = rawSeries.slice(startIndex, endIndex);

    if (candles.length === 0) return null;

    let rawMin = Infinity;
    let rawMax = -Infinity;
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      if (c.low < rawMin) rawMin = c.low;
      if (c.high > rawMax) rawMax = c.high;
    }

    if (currentPrice > rawMax) rawMax = currentPrice;
    if (currentPrice < rawMin) rawMin = currentPrice;

    const precision = getPrecision(currentPrice || 100);
    const minSpan = Math.pow(10, -precision) * 4;
    const rawRange = (rawMax - rawMin > minSpan) ? (rawMax - rawMin) : (rawMax > 0 ? rawMax * 0.005 : minSpan);
    const basePadding = rawRange * 0.12;
    const midPrice = (rawMax + rawMin) / 2 + (priceCenterShift * rawRange);
    const scaledHalfRange = Math.max(minSpan, ((rawRange + basePadding * 2) / 2) / Math.max(0.1, priceScaleMultiplier));

    const yMin = midPrice - scaledHalfRange;
    const yMax = midPrice + scaledHalfRange;
    const yRange = (yMax - yMin > 0) ? (yMax - yMin) : minSpan;

    const mapper = getCoordinatesMapper(candles, safeOffset, yMin, yRange);

    return { candles, safeOffset, yMin, yMax, yRange, mapper, rawSeries };
  }, [assetId, currentPrice, timeFrame, visibleCount, panOffset, priceCenterShift, priceScaleMultiplier, getCoordinatesMapper]);

  // Snap point to nearest candle High / Low / Close if magnet is ON
  const snapToCandle = useCallback((x: number, y: number): ChartPoint => {
    const data = getWindowData();
    if (!data) return { time: Date.now(), price: currentPrice || 100 };

    const { candles, mapper } = data;
    const time = mapper.getTimeFromX(x);
    let price = mapper.getPriceFromY(y);

    if (magnetMode) {
      const match = candles.find(c => c.time === time);
      if (match) {
        const dHigh = Math.abs(price - match.high);
        const dLow = Math.abs(price - match.low);
        const dClose = Math.abs(price - match.close);
        const dOpen = Math.abs(price - match.open);
        const minD = Math.min(dHigh, dLow, dClose, dOpen);
        if (minD === dHigh) price = match.high;
        else if (minD === dLow) price = match.low;
        else if (minD === dClose) price = match.close;
        else price = match.open;
      }
    }

    return { time, price };
  }, [getWindowData, magnetMode, currentPrice]);

  // 60FPS High-DPI Canvas Rendering Engine
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.floor(dimensions.width * dpr);
    const targetH = Math.floor(dimensions.height * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    const isDark = theme === 'dark';
    const bg = isDark ? '#0b1118' : '#ffffff';
    const gridColor = isDark ? '#162231' : '#f1f5f9';
    const axisBg = isDark ? '#090e15' : '#f8fafc';
    const axisBorder = isDark ? '#1e293b' : '#e2e8f0';
    const textMuted = isDark ? '#64748b' : '#94a3b8';
    const green = '#00b067';
    const red = '#ff3b30';

    // 1. Clear background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // 2. Axis Panels
    ctx.fillStyle = axisBg;
    ctx.fillRect(mainPlotWidth, 0, priceAxisWidth, dimensions.height);
    ctx.fillRect(0, dimensions.height - timeAxisHeight, dimensions.width, timeAxisHeight);

    // 3. Axis Borders
    ctx.fillStyle = axisBorder;
    ctx.fillRect(mainPlotWidth, 0, 1, dimensions.height);
    ctx.fillRect(0, dimensions.height - timeAxisHeight, dimensions.width, 1);

    const data = getWindowData();
    if (!data) {
      ctx.restore();
      return;
    }

    const { candles, mapper } = data;
    const { getXForTime, getYForPrice, getPriceFromY, slotWidth } = mapper;
    const decimals = getPrecision(currentPrice || 100);

    // 4. Horizontal Price Grid & Labels
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    const gridSteps = 5;

    ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= gridSteps; i++) {
      const y = Math.floor((mainPlotHeight / gridSteps) * i) + 0.5;

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(mainPlotWidth, y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(mainPlotWidth, y);
      ctx.lineTo(mainPlotWidth + 4, y);
      ctx.stroke();

      const p = getPriceFromY(y);
      ctx.fillStyle = textMuted;
      ctx.fillText(p.toFixed(decimals), mainPlotWidth + 6, y);
    }

    // 5. Time Axis Grid & Labels
    const timeStep = Math.max(4, Math.floor(candles.length / 5));

    for (let i = 0; i < candles.length; i += timeStep) {
      const c = candles[i];
      const x = Math.floor(i * slotWidth + slotWidth / 2) + 0.5;

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, mainPlotHeight);
      ctx.stroke();

      const timeStr = selectedTimezone 
        ? formatTimeInTz(c.time, selectedTimezone.offsetMinutes, true)
        : new Date(c.time).toLocaleTimeString([], { hour12: false });
      ctx.fillStyle = textMuted;
      ctx.textAlign = 'center';
      ctx.fillText(timeStr, x, dimensions.height - 11);
    }

    // 6. Main Plot Elements (Clipped)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, mainPlotWidth, mainPlotHeight);
    ctx.clip();

    // 6a. Main Candlesticks / Area Chart
    if (chartType === 'area') {
      ctx.beginPath();
      for (let i = 0; i < candles.length; i++) {
        const c = candles[i];
        const x = i * slotWidth + slotWidth / 2;
        const y = getYForPrice(c.close);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#0088cc';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      const lastX = (candles.length - 1) * slotWidth + slotWidth / 2;
      ctx.lineTo(lastX, mainPlotHeight);
      ctx.lineTo(slotWidth / 2, mainPlotHeight);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, 0, 0, mainPlotHeight);
      grad.addColorStop(0, isDark ? 'rgba(0, 136, 204, 0.45)' : 'rgba(0, 136, 204, 0.25)');
      grad.addColorStop(1, 'rgba(0, 136, 204, 0.00)');
      ctx.fillStyle = grad;
      ctx.fill();
    } else {
      const candleWidth = Math.max(3, Math.min(Math.floor(slotWidth * 0.76), 34));
      const halfWidth = Math.floor(candleWidth / 2);
      const actualWidth = Math.max(3, halfWidth * 2 + 1);

      for (let i = 0; i < candles.length; i++) {
        const c = candles[i];
        const rawX = i * slotWidth + slotWidth / 2;
        const centerX = Math.floor(rawX);
        const isUp = c.close >= c.open;
        const color = isUp ? green : red;

        const openY = getYForPrice(c.open);
        const closeY = getYForPrice(c.close);
        const highY = getYForPrice(c.high);
        const lowY = getYForPrice(c.low);

        const minY = Math.min(highY, lowY);
        const maxY = Math.max(highY, lowY);

        // Wick
        ctx.strokeStyle = color;
        ctx.lineWidth = candleWidth > 12 ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(centerX + 0.5, minY);
        ctx.lineTo(centerX + 0.5, maxY);
        ctx.stroke();

        // Body
        ctx.fillStyle = color;
        const bodyTop = Math.min(openY, closeY);
        const rawBodyHeight = Math.abs(closeY - openY);
        const bodyHeight = rawBodyHeight < 1.5 ? 2 : rawBodyHeight;
        const bodyLeft = centerX - halfWidth;

        ctx.fillRect(bodyLeft, bodyTop, actualWidth, bodyHeight);
      }
    }

    // 6b. Active Trades Strike Lines
    activeTrades.forEach(trade => {
      if (trade.status !== 'active' || trade.assetId !== assetId) return;
      const y = getYForPrice(trade.entryPrice);
      const isCall = trade.type === 'CALL';
      const isWinning = isCall ? currentPrice > trade.entryPrice : currentPrice < trade.entryPrice;
      const tradeColor = isWinning ? green : red;

      ctx.strokeStyle = tradeColor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(0, Math.floor(y) + 0.5);
      ctx.lineTo(mainPlotWidth, Math.floor(y) + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);

      const badgeW = 86;
      const badgeH = 20;
      const badgeX = Math.max(10, mainPlotWidth - badgeW - 8);
      const badgeY = Math.max(6, Math.min(y - 10, mainPlotHeight - badgeH - 6));

      ctx.fillStyle = tradeColor;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 10);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${isCall ? '▲ CALL' : '▼ PUT'} ₹${trade.amount}`, badgeX + badgeW / 2, badgeY + badgeH / 2);
    });

    // Helper: Draw Handle Circle on Point (Crisp, high-contrast anchor handles)
    const drawHandle = (x: number, y: number, color: string, isSelected: boolean) => {
      ctx.save();
      ctx.setLineDash([]);
      // Outer glow
      ctx.fillStyle = isSelected ? 'rgba(0, 136, 204, 0.45)' : 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();

      // White body
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 5.5, 0, Math.PI * 2);
      ctx.fill();

      // Colored border
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, 5.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };

    // 6c. Render Drawings (Movable, Selected Highlight, Anchor Handles)
    if (!hideAllDrawings) {
      drawings.forEach(item => {
        const isSelected = item.id === selectedDrawingId;
        ctx.save();

        // Selected Outer Highlight Aura
        if (isSelected) {
          ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(0, 136, 204, 0.35)';
          ctx.lineWidth = (item.lineWidth || 2) + 6;
          ctx.lineCap = 'round';
          
          if (item.type === 'horizontal' && item.points.length >= 1) {
            const y = getYForPrice(item.points[0].price);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(mainPlotWidth, y);
            ctx.stroke();
          } else if (item.type === 'trendline' && item.points.length >= 2) {
            const x1 = getXForTime(item.points[0].time);
            const y1 = getYForPrice(item.points[0].price);
            const x2 = getXForTime(item.points[1].time);
            const y2 = getYForPrice(item.points[1].price);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
        }

        ctx.strokeStyle = item.color;
        ctx.lineWidth = item.lineWidth || 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (item.lineStyle === 'dashed') ctx.setLineDash([6, 4]);
        else if (item.lineStyle === 'dotted') ctx.setLineDash([2, 3]);
        else ctx.setLineDash([]);

        // Render based on drawing type:
        if (item.type === 'horizontal' && item.points.length >= 1) {
          const y = getYForPrice(item.points[0].price);
          ctx.beginPath();
          ctx.moveTo(0, Math.floor(y) + 0.5);
          ctx.lineTo(mainPlotWidth, Math.floor(y) + 0.5);
          ctx.stroke();

          // Price Tag Badge
          ctx.fillStyle = item.color;
          ctx.beginPath();
          ctx.roundRect(4, y - 8, 56, 16, 4);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(item.points[0].price.toFixed(decimals), 32, y + 3);

          if (isSelected) {
            drawHandle(mainPlotWidth / 2, y, item.color, true);
          }
        } else if (item.type === 'horizontal_ray' && item.points.length >= 1) {
          const x = getXForTime(item.points[0].time);
          const y = getYForPrice(item.points[0].price);
          ctx.beginPath();
          ctx.moveTo(x, Math.floor(y) + 0.5);
          ctx.lineTo(mainPlotWidth, Math.floor(y) + 0.5);
          ctx.stroke();

          if (isSelected) {
            drawHandle(x, y, item.color, true);
            drawHandle(Math.min(mainPlotWidth - 20, (x + mainPlotWidth) / 2), y, item.color, true);
          } else {
            ctx.fillStyle = item.color;
            ctx.beginPath();
            ctx.arc(x, y, 3.5, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (item.type === 'vertical' && item.points.length >= 1) {
          const x = getXForTime(item.points[0].time);
          ctx.beginPath();
          ctx.moveTo(Math.floor(x) + 0.5, 0);
          ctx.lineTo(Math.floor(x) + 0.5, mainPlotHeight);
          ctx.stroke();

          if (isSelected) {
            drawHandle(x, mainPlotHeight / 2, item.color, true);
          }
        } else if (item.type === 'trendline' && item.points.length >= 2) {
          const x1 = getXForTime(item.points[0].time);
          const y1 = getYForPrice(item.points[0].price);
          const x2 = getXForTime(item.points[1].time);
          const y2 = getYForPrice(item.points[1].price);

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          if (isSelected) {
            drawHandle(x1, y1, item.color, true);
            drawHandle(x2, y2, item.color, true);
            drawHandle((x1 + x2) / 2, (y1 + y2) / 2, item.color, true);
          }
        } else if (item.type === 'arrow' && item.points.length >= 2) {
          const x1 = getXForTime(item.points[0].time);
          const y1 = getYForPrice(item.points[0].price);
          const x2 = getXForTime(item.points[1].time);
          const y2 = getYForPrice(item.points[1].price);

          // Shaft
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          // Arrow head
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const headLen = 12;
          ctx.fillStyle = item.color;
          ctx.beginPath();
          ctx.moveTo(x2, y2);
          ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
          ctx.closePath();
          ctx.fill();

          if (isSelected) {
            drawHandle(x1, y1, item.color, true);
            drawHandle(x2, y2, item.color, true);
          }
        } else if (item.type === 'rectangle' && item.points.length >= 2) {
          const x1 = getXForTime(item.points[0].time);
          const y1 = getYForPrice(item.points[0].price);
          const x2 = getXForTime(item.points[1].time);
          const y2 = getYForPrice(item.points[1].price);

          const left = Math.min(x1, x2);
          const top = Math.min(y1, y2);
          const width = Math.abs(x2 - x1);
          const height = Math.abs(y2 - y1);

          // Semi-transparent box fill
          ctx.fillStyle = isDark ? 'rgba(0, 136, 204, 0.15)' : 'rgba(0, 136, 204, 0.12)';
          ctx.fillRect(left, top, width, height);

          // Border
          ctx.strokeRect(left, top, width, height);

          if (isSelected) {
            drawHandle(x1, y1, item.color, true);
            drawHandle(x2, y2, item.color, true);
            drawHandle(x1, y2, item.color, true);
            drawHandle(x2, y1, item.color, true);
            drawHandle((x1 + x2) / 2, (y1 + y2) / 2, item.color, true);
          }
        } else if (item.type === 'fibonacci' && item.points.length >= 2) {
          const p1 = item.points[0];
          const p2 = item.points[1];
          const x1 = getXForTime(p1.time);
          const x2 = getXForTime(p2.time);
          const y1 = getYForPrice(p1.price);
          const y2 = getYForPrice(p2.price);

          const leftX = Math.min(x1, x2);
          const rightX = Math.max(x1, x2, mainPlotWidth);

          const diffPrice = p2.price - p1.price;
          const fibRatios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
          const fibColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7'];

          // Draw Trend Axis
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          ctx.setLineDash([]);

          fibRatios.forEach((ratio, fIdx) => {
            const fibPrice = p1.price + diffPrice * ratio;
            const fibY = getYForPrice(fibPrice);

            ctx.strokeStyle = fibColors[fIdx % fibColors.length];
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(leftX, Math.floor(fibY) + 0.5);
            ctx.lineTo(rightX, Math.floor(fibY) + 0.5);
            ctx.stroke();

            ctx.fillStyle = fibColors[fIdx % fibColors.length];
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`${(ratio * 100).toFixed(1)}% (${fibPrice.toFixed(decimals)})`, leftX + 4, fibY - 3);
          });

          if (isSelected) {
            drawHandle(x1, y1, item.color, true);
            drawHandle(x2, y2, item.color, true);
          }
        } else if (item.type === 'ruler' && item.points.length >= 2) {
          const p1 = item.points[0];
          const p2 = item.points[1];
          const x1 = getXForTime(p1.time);
          const y1 = getYForPrice(p1.price);
          const x2 = getXForTime(p2.time);
          const y2 = getYForPrice(p2.price);

          ctx.fillStyle = isDark ? 'rgba(0, 136, 204, 0.15)' : 'rgba(0, 136, 204, 0.12)';
          ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));

          ctx.strokeStyle = '#0088cc';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          const priceDiff = p2.price - p1.price;
          const pctDiff = (priceDiff / (p1.price || 1)) * 100;
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;

          ctx.fillStyle = priceDiff >= 0 ? green : red;
          ctx.beginPath();
          ctx.roundRect(midX - 35, midY - 10, 70, 20, 6);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${priceDiff >= 0 ? '+' : ''}${pctDiff.toFixed(2)}%`, midX, midY + 3);

          if (isSelected) {
            drawHandle(x1, y1, '#0088cc', true);
            drawHandle(x2, y2, '#0088cc', true);
          }
        } else if (item.type === 'brush' && item.points.length >= 2) {
          ctx.beginPath();
          item.points.forEach((pt, pIdx) => {
            const x = getXForTime(pt.time);
            const y = getYForPrice(pt.price);
            if (pIdx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();

          if (isSelected && item.points.length > 0) {
            const mid = item.points[Math.floor(item.points.length / 2)];
            drawHandle(getXForTime(mid.time), getYForPrice(mid.price), item.color, true);
          }
        }

        ctx.restore();
      });
    }

    // 6d. Live In-Progress Drawing Preview
    if (inProgressPoints.length > 0 && interactionRef.current.hoverX !== null && interactionRef.current.hoverY !== null) {
      const p1 = inProgressPoints[0];
      const x1 = getXForTime(p1.time);
      const y1 = getYForPrice(p1.price);
      const x2 = interactionRef.current.hoverX;
      const y2 = interactionRef.current.hoverY;

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);

      if (activeDrawingTool === 'trendline' || activeDrawingTool === 'arrow' || activeDrawingTool === 'ruler') {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      } else if (activeDrawingTool === 'rectangle') {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
        ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
        ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      } else if (activeDrawingTool === 'fibonacci') {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // 7. Live Laser Current Price Line
    const currentY = getYForPrice(currentPrice);
    if (currentY >= 0 && currentY <= mainPlotHeight) {
      ctx.beginPath();
      ctx.strokeStyle = green;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.moveTo(0, Math.floor(currentY) + 0.5);
      ctx.lineTo(mainPlotWidth, Math.floor(currentY) + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(mainPlotWidth - 4, currentY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = green;
      ctx.fill();
    }

    // 8. Crosshair Lines
    const { hoverX, hoverY } = interactionRef.current;
    if (hoverX !== null && hoverY !== null && hoverX >= 0 && hoverX <= mainPlotWidth && hoverY >= 0 && hoverY <= mainPlotHeight) {
      ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.5)' : 'rgba(100, 116, 139, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      ctx.beginPath();
      ctx.moveTo(Math.floor(hoverX) + 0.5, 0);
      ctx.lineTo(Math.floor(hoverX) + 0.5, mainPlotHeight);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, Math.floor(hoverY) + 0.5);
      ctx.lineTo(mainPlotWidth, Math.floor(hoverY) + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore(); // Restore clip

    // 9. Live Price Badge on Right Axis
    if (currentY >= -15 && currentY <= dimensions.height + 15) {
      const badgeY = Math.max(12, Math.min(currentY, mainPlotHeight - 12));
      const badgeHeight = 18;
      const badgeWidth = priceAxisWidth - 2;

      ctx.fillStyle = green;
      ctx.beginPath();
      ctx.moveTo(mainPlotWidth - 4, badgeY);
      ctx.lineTo(mainPlotWidth + 2, badgeY - badgeHeight / 2);
      ctx.lineTo(mainPlotWidth + badgeWidth, badgeY - badgeHeight / 2);
      ctx.lineTo(mainPlotWidth + badgeWidth, badgeY + badgeHeight / 2);
      ctx.lineTo(mainPlotWidth + 2, badgeY + badgeHeight / 2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(currentPrice.toFixed(decimals), mainPlotWidth + badgeWidth / 2 + 1, badgeY);
    }

    // 10. Crosshair Hover Badge on Right Axis
    if (hoverX !== null && hoverY !== null && hoverY >= 0 && hoverY <= mainPlotHeight) {
      const hoverPrice = getPriceFromY(hoverY);
      ctx.fillStyle = isDark ? '#1e293b' : '#334155';
      ctx.fillRect(mainPlotWidth + 1, hoverY - 9, priceAxisWidth - 2, 18);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hoverPrice.toFixed(decimals), mainPlotWidth + (priceAxisWidth - 2) / 2 + 1, hoverY);
    }

    ctx.restore();
  }, [
    dimensions, theme, assetId, currentPrice, chartType, 
    activeTrades, mainPlotWidth, mainPlotHeight, selectedTimezone,
    drawings, hideAllDrawings, selectedDrawingId, inProgressPoints,
    activeDrawingTool, getWindowData
  ]);

  // Request Animation Frame loop
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(renderCanvas);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [renderCanvas]);

  // Zoom Controls
  const handleZoom = (zoomIn: boolean) => {
    setVisibleCount(prev => {
      const step = prev > 100 ? 20 : prev > 50 ? 10 : prev > 20 ? 4 : 2;
      return zoomIn ? Math.max(6, prev - step) : Math.min(320, prev + step);
    });
  };

  const handleResetAll = () => {
    setPanOffset(0);
    setVisibleCount(32);
    setPriceScaleMultiplier(1.0);
    setPriceCenterShift(0);
  };

  // Keyboard shortcut to delete selected drawing or cancel tool
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedDrawingId) {
          setDrawings(prev => prev.filter(d => d.id !== selectedDrawingId));
          setSelectedDrawingId(null);
        }
      } else if (e.key === 'Escape') {
        setSelectedDrawingId(null);
        setActiveDrawingTool('none');
        setInProgressPoints([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDrawingId]);

  // Hit-Testing: Check if cursor hits a handle or body of drawings (High tolerance for effortless control)
  const hitTestDrawings = useCallback((screenX: number, screenY: number) => {
    const data = getWindowData();
    if (!data) return null;
    const { mapper } = data;
    const { getXForTime, getYForPrice } = mapper;

    // 1. First check handles of the currently selected drawing (Handle hit radius: 18px)
    if (selectedDrawingId) {
      const sel = drawings.find(d => d.id === selectedDrawingId);
      if (sel && !sel.locked) {
        // Point handles
        for (let i = 0; i < sel.points.length; i++) {
          const pt = sel.points[i];
          const hx = getXForTime(pt.time);
          const hy = getYForPrice(pt.price);
          if (Math.hypot(screenX - hx, screenY - hy) <= 18) {
            return { drawing: sel, handleIndex: i, type: 'handle' as const };
          }
        }
        // Center mid handle for moving trendlines / rectangles / horizontals
        if (sel.type === 'horizontal' && sel.points.length >= 1) {
          const hy = getYForPrice(sel.points[0].price);
          if (Math.hypot(screenX - (mainPlotWidth / 2), screenY - hy) <= 18) {
            return { drawing: sel, handleIndex: null, type: 'body' as const };
          }
        } else if (sel.points.length >= 2) {
          const x1 = getXForTime(sel.points[0].time);
          const y1 = getYForPrice(sel.points[0].price);
          const x2 = getXForTime(sel.points[1].time);
          const y2 = getYForPrice(sel.points[1].price);
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          if (Math.hypot(screenX - midX, screenY - midY) <= 18) {
            return { drawing: sel, handleIndex: null, type: 'body' as const };
          }
        }
      }
    }

    // 2. Check line / shape body of all drawings (Hit tolerance: 16px for effortless grab)
    const HIT_TOLERANCE = 16;
    for (let i = drawings.length - 1; i >= 0; i--) {
      const item = drawings[i];
      if (item.type === 'horizontal' && item.points.length >= 1) {
        const y = getYForPrice(item.points[0].price);
        if (Math.abs(screenY - y) <= HIT_TOLERANCE && screenX <= mainPlotWidth) {
          return { drawing: item, handleIndex: null, type: 'body' as const };
        }
      } else if (item.type === 'horizontal_ray' && item.points.length >= 1) {
        const x = getXForTime(item.points[0].time);
        const y = getYForPrice(item.points[0].price);
        if (screenX >= x - 10 && screenX <= mainPlotWidth && Math.abs(screenY - y) <= HIT_TOLERANCE) {
          return { drawing: item, handleIndex: null, type: 'body' as const };
        }
      } else if (item.type === 'vertical' && item.points.length >= 1) {
        const x = getXForTime(item.points[0].time);
        if (Math.abs(screenX - x) <= HIT_TOLERANCE && screenY <= mainPlotHeight) {
          return { drawing: item, handleIndex: null, type: 'body' as const };
        }
      } else if ((item.type === 'trendline' || item.type === 'arrow' || item.type === 'ruler') && item.points.length >= 2) {
        const x1 = getXForTime(item.points[0].time);
        const y1 = getYForPrice(item.points[0].price);
        const x2 = getXForTime(item.points[1].time);
        const y2 = getYForPrice(item.points[1].price);
        if (distToSegment(screenX, screenY, x1, y1, x2, y2) <= HIT_TOLERANCE) {
          return { drawing: item, handleIndex: null, type: 'body' as const };
        }
      } else if (item.type === 'rectangle' && item.points.length >= 2) {
        const x1 = getXForTime(item.points[0].time);
        const y1 = getYForPrice(item.points[0].price);
        const x2 = getXForTime(item.points[1].time);
        const y2 = getYForPrice(item.points[1].price);
        const left = Math.min(x1, x2);
        const right = Math.max(x1, x2);
        const top = Math.min(y1, y2);
        const bottom = Math.max(y1, y2);
        if (screenX >= left - HIT_TOLERANCE && screenX <= right + HIT_TOLERANCE && screenY >= top - HIT_TOLERANCE && screenY <= bottom + HIT_TOLERANCE) {
          return { drawing: item, handleIndex: null, type: 'body' as const };
        }
      } else if (item.type === 'fibonacci' && item.points.length >= 2) {
        const p1 = item.points[0];
        const p2 = item.points[1];
        const x1 = getXForTime(p1.time);
        const x2 = getXForTime(p2.time);
        const y1 = getYForPrice(p1.price);
        const y2 = getYForPrice(p2.price);
        const leftX = Math.min(x1, x2) - 20;
        const rightX = Math.max(x1, x2, mainPlotWidth);
        const diffPrice = p2.price - p1.price;
        const ratios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];

        // Check if hitting any Fibonacci level line
        for (const r of ratios) {
          const fy = getYForPrice(p1.price + diffPrice * r);
          if (screenX >= leftX && screenX <= rightX && Math.abs(screenY - fy) <= HIT_TOLERANCE) {
            return { drawing: item, handleIndex: null, type: 'body' as const };
          }
        }
        if (distToSegment(screenX, screenY, x1, y1, x2, y2) <= HIT_TOLERANCE) {
          return { drawing: item, handleIndex: null, type: 'body' as const };
        }
      } else if (item.type === 'brush' && item.points.length >= 2) {
        for (let j = 0; j < item.points.length - 1; j++) {
          const bx1 = getXForTime(item.points[j].time);
          const by1 = getYForPrice(item.points[j].price);
          const bx2 = getXForTime(item.points[j + 1].time);
          const by2 = getYForPrice(item.points[j + 1].price);
          if (distToSegment(screenX, screenY, bx1, by1, bx2, by2) <= HIT_TOLERANCE) {
            return { drawing: item, handleIndex: null, type: 'body' as const };
          }
        }
      }
    }

    return null;
  }, [getWindowData, selectedDrawingId, drawings, mainPlotWidth, mainPlotHeight]);

  // Clone drawing handler
  const handleCloneDrawing = (d: DrawingItem) => {
    const data = getWindowData();
    if (!data) return;
    const priceOffset = (data.yRange || 10) * 0.04;
    const timeOffset = getTimeFrameMs(timeFrame) * 2;

    const cloned: DrawingItem = {
      ...d,
      id: `draw_${Date.now()}`,
      points: d.points.map(p => ({
        time: p.time + timeOffset,
        price: p.price + priceOffset
      }))
    };
    setDrawings(prev => [...prev, cloned]);
    setSelectedDrawingId(cloned.id);
  };

  // Mouse Down Event Handler
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-interactive="true"]') || target.closest('button') || target.tagName === 'BUTTON') {
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 1. Right Axis Drag -> Price Scale
    if (x >= mainPlotWidth) {
      interactionRef.current = {
        ...interactionRef.current,
        mode: 'price_scale',
        startX: e.clientX,
        startY: e.clientY,
        startPriceScale: priceScaleMultiplier,
        startPriceShift: priceCenterShift,
      };
      return;
    }

    // 2. Bottom Axis Drag -> Time Scale
    if (y >= dimensions.height - timeAxisHeight) {
      interactionRef.current = {
        ...interactionRef.current,
        mode: 'time_scale',
        startX: e.clientX,
        startY: e.clientY,
        startVisibleCount: visibleCount,
      };
      return;
    }

    // 3. Active Drawing Tool Creation (Click to Place)
    if (activeDrawingTool !== 'none' && x < mainPlotWidth && y < mainPlotHeight) {
      const snapped = snapToCandle(x, y);

      // Freehand Brush Mode
      if (activeDrawingTool === 'brush') {
        const newDrawing: DrawingItem = {
          id: `draw_${Date.now()}`,
          type: 'brush',
          points: [snapped],
          color: '#fbbf24',
          lineWidth: 2.5,
          lineStyle: 'solid'
        };
        setDrawings(prev => [...prev, newDrawing]);
        setSelectedDrawingId(newDrawing.id);
        interactionRef.current = {
          ...interactionRef.current,
          mode: 'brush',
          dragDrawingId: newDrawing.id,
        };
        return;
      }

      // 1-Click Tools (Horizontal Line, Horizontal Ray, Vertical Line)
      if (activeDrawingTool === 'horizontal' || activeDrawingTool === 'horizontal_ray' || activeDrawingTool === 'vertical') {
        const newDrawing: DrawingItem = {
          id: `draw_${Date.now()}`,
          type: activeDrawingTool,
          points: [snapped],
          color: activeDrawingTool === 'horizontal' ? '#fbbf24' : '#0088cc',
          lineWidth: 2,
          lineStyle: 'solid'
        };
        setDrawings(prev => [...prev, newDrawing]);
        setSelectedDrawingId(newDrawing.id);
        setActiveDrawingTool('none');
        return;
      }

      // 2-Click Tools (Trendline, Rectangle, Fibonacci, Arrow, Ruler, Channel)
      if (inProgressPoints.length === 0) {
        setInProgressPoints([snapped]);
      } else {
        const newDrawing: DrawingItem = {
          id: `draw_${Date.now()}`,
          type: activeDrawingTool,
          points: [inProgressPoints[0], snapped],
          color: activeDrawingTool === 'fibonacci' ? '#a855f7' : activeDrawingTool === 'rectangle' ? '#0088cc' : activeDrawingTool === 'arrow' ? '#00b067' : '#fbbf24',
          lineWidth: 2,
          lineStyle: 'solid'
        };
        setDrawings(prev => [...prev, newDrawing]);
        setSelectedDrawingId(newDrawing.id);
        setInProgressPoints([]);
        setActiveDrawingTool('none');
      }
      return;
    }

    // 4. Hit-Test Existing Drawings to Move / Drag
    const hit = hitTestDrawings(x, y);
    if (hit) {
      setSelectedDrawingId(hit.drawing.id);
      const data = getWindowData();
      if (!data) return;
      const { mapper } = data;

      if (hit.type === 'handle' && hit.handleIndex !== null) {
        // Dragging a specific handle (Anchor Point)
        interactionRef.current = {
          ...interactionRef.current,
          mode: 'drag_handle',
          startX: e.clientX,
          startY: e.clientY,
          dragDrawingId: hit.drawing.id,
          dragHandleIndex: hit.handleIndex,
          startPoints: hit.drawing.points.map(p => ({ ...p })),
          startMousePrice: mapper.getPriceFromY(y),
          startMouseTime: mapper.getTimeFromX(x),
        };
        return;
      } else {
        // Dragging entire Drawing Body (Whole Line / Box / Fib)
        interactionRef.current = {
          ...interactionRef.current,
          mode: 'drag_drawing',
          startX: e.clientX,
          startY: e.clientY,
          dragDrawingId: hit.drawing.id,
          dragHandleIndex: null,
          startPoints: hit.drawing.points.map(p => ({ ...p })),
          startMousePrice: mapper.getPriceFromY(y),
          startMouseTime: mapper.getTimeFromX(x),
        };
        return;
      }
    }

    // 5. Clicked empty plot area -> Deselect and Pan Chart
    setSelectedDrawingId(null);
    interactionRef.current = {
      ...interactionRef.current,
      mode: 'pan',
      startX: e.clientX,
      startY: e.clientY,
      startPanOffset: panOffset,
      startPriceShift: priceCenterShift,
    };
  };

  // Mouse Move Event Handler (Smooth 60FPS Drag & Scale)
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = Math.max(0, Math.min(e.clientX - rect.left, dimensions.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, dimensions.height));

    interactionRef.current.hoverX = x;
    interactionRef.current.hoverY = y;

    const { mode, startY, startX, startPriceScale, startPanOffset, startVisibleCount, dragDrawingId, dragHandleIndex, startPoints, startMousePrice, startMouseTime } = interactionRef.current;

    // Price Scale Dragging
    if (mode === 'price_scale') {
      const deltaY = startY - e.clientY;
      const sensitivity = 0.007;
      const newScale = Math.max(0.15, Math.min(8.0, startPriceScale * Math.exp(deltaY * sensitivity)));
      setPriceScaleMultiplier(newScale);
      return;
    }

    // Time Scale Dragging
    if (mode === 'time_scale') {
      const deltaX = e.clientX - startX;
      const shift = Math.round(deltaX / 15);
      setVisibleCount(Math.max(6, Math.min(320, startVisibleCount - shift)));
      return;
    }

    // Freehand Brush Dragging
    if (mode === 'brush' && dragDrawingId) {
      const snapped = snapToCandle(x, y);
      setDrawings(prev => prev.map(d => {
        if (d.id === dragDrawingId) {
          return { ...d, points: [...d.points, snapped] };
        }
        return d;
      }));
      return;
    }

    // Dragging an Anchor Handle (Resize / Adjust Angle)
    if (mode === 'drag_handle' && dragDrawingId && dragHandleIndex !== null) {
      const snapped = snapToCandle(x, y);
      setDrawings(prev => prev.map(d => {
        if (d.id === dragDrawingId) {
          const updatedPoints = [...d.points];
          updatedPoints[dragHandleIndex] = snapped;
          return { ...d, points: updatedPoints };
        }
        return d;
      }));
      return;
    }

    // Dragging Entire Drawing Body (Move whole line / box in price & time!)
    if (mode === 'drag_drawing' && dragDrawingId && startPoints.length > 0) {
      const data = getWindowData();
      if (!data) return;
      const { mapper } = data;
      const currentMousePrice = mapper.getPriceFromY(y);
      const currentMouseTime = mapper.getTimeFromX(x);

      const deltaPrice = currentMousePrice - startMousePrice;
      const deltaTime = currentMouseTime - startMouseTime;

      setDrawings(prev => prev.map(d => {
        if (d.id === dragDrawingId && !d.locked) {
          return {
            ...d,
            points: startPoints.map(p => ({
              time: p.time + deltaTime,
              price: p.price + deltaPrice
            }))
          };
        }
        return d;
      }));
      return;
    }

    // Pan Chart
    if (mode === 'pan') {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const slotWidth = mainPlotWidth / visibleCount;
      const candleShift = Math.round(deltaX / slotWidth);
      const rawSeries = getCandleSeries(assetId, currentPrice || 2499.07, timeFrame);
      const maxOffset = Math.max(0, rawSeries.length - visibleCount);
      const newOffset = Math.max(-12, Math.min(maxOffset, startPanOffset + candleShift));
      setPanOffset(newOffset);

      const verticalRatio = deltaY / mainPlotHeight;
      setPriceCenterShift(touchStateRef.current.startPriceShift + verticalRatio * (1.2 / Math.max(0.2, priceScaleMultiplier)));
      return;
    }

    // Dynamic Hover Cursor Detection
    if (activeDrawingTool !== 'none') {
      setCursorStyle('crosshair');
    } else if (x >= mainPlotWidth) {
      setCursorStyle('ns-resize');
    } else if (y >= dimensions.height - timeAxisHeight) {
      setCursorStyle('ew-resize');
    } else {
      const hit = hitTestDrawings(x, y);
      if (hit) {
        setCursorStyle(hit.type === 'handle' ? 'pointer' : 'move');
      } else {
        setCursorStyle('crosshair');
      }
    }

    // Hover detection for OHLC HUD
    const data = getWindowData();
    if (data) {
      const { candles, mapper } = data;
      const idx = Math.min(Math.floor(x / mapper.slotWidth), candles.length - 1);
      if (idx >= 0 && idx < candles.length) {
        setHoveredCandle(candles[idx]);
      }
    }
  };

  const handleMouseUp = () => {
    if (interactionRef.current.mode === 'brush') {
      setActiveDrawingTool('none');
    }
    interactionRef.current.mode = 'none';
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;

    if (x >= mainPlotWidth) {
      setPriceScaleMultiplier(1.0);
      setPriceCenterShift(0);
    } else {
      handleResetAll();
    }
  };

  // Keyboard Shortcuts (Delete, Escape, Duplicate)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedDrawingId) {
          setDrawings(prev => prev.filter(d => d.id !== selectedDrawingId));
          setSelectedDrawingId(null);
        }
      } else if (e.key === 'Escape') {
        setActiveDrawingTool('none');
        setInProgressPoints([]);
        setSelectedDrawingId(null);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selectedDrawingId) {
          const sel = drawings.find(d => d.id === selectedDrawingId);
          if (sel) handleCloneDrawing(sel);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDrawingId, drawings]);

  // Touch Handlers with Panning, Pinch Zoom, and Drawing
  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-interactive="true"]') || target.closest('button') || target.tagName === 'BUTTON') {
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (e.touches.length === 1) {
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;

      if (activeDrawingTool !== 'none' && x < mainPlotWidth && y < mainPlotHeight) {
        const snapped = snapToCandle(x, y);

        if (activeDrawingTool === 'horizontal' || activeDrawingTool === 'horizontal_ray' || activeDrawingTool === 'vertical') {
          const newDrawing: DrawingItem = {
            id: `draw_${Date.now()}`,
            type: activeDrawingTool,
            points: [snapped],
            color: activeDrawingTool === 'horizontal' ? '#fbbf24' : '#0088cc',
            lineWidth: 2,
            lineStyle: 'solid'
          };
          setDrawings(prev => [...prev, newDrawing]);
          setSelectedDrawingId(newDrawing.id);
          setActiveDrawingTool('none');
          return;
        }

        if (inProgressPoints.length === 0) {
          setInProgressPoints([snapped]);
        } else {
          const newDrawing: DrawingItem = {
            id: `draw_${Date.now()}`,
            type: activeDrawingTool,
            points: [inProgressPoints[0], snapped],
            color: activeDrawingTool === 'fibonacci' ? '#a855f7' : activeDrawingTool === 'rectangle' ? '#0088cc' : '#fbbf24',
            lineWidth: 2,
            lineStyle: 'solid'
          };
          setDrawings(prev => [...prev, newDrawing]);
          setSelectedDrawingId(newDrawing.id);
          setInProgressPoints([]);
          setActiveDrawingTool('none');
        }
        return;
      }

      // Check hit test on touch
      const hit = hitTestDrawings(x, y);
      if (hit) {
        setSelectedDrawingId(hit.drawing.id);
        const data = getWindowData();
        if (data) {
          const { mapper } = data;
          touchStateRef.current = {
            ...touchStateRef.current,
            mode: hit.type === 'handle' ? 'drag_handle' : 'drag_drawing',
            startX: e.touches[0].clientX,
            startY: e.touches[0].clientY,
            dragDrawingId: hit.drawing.id,
            dragHandleIndex: hit.handleIndex,
            startPoints: hit.drawing.points.map(p => ({ ...p })),
            startMousePrice: mapper.getPriceFromY(y),
            startMouseTime: mapper.getTimeFromX(x),
          };
          return;
        }
      }

      if (x >= mainPlotWidth) {
        touchStateRef.current = {
          ...touchStateRef.current,
          mode: 'price_scale',
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          startPriceScale: priceScaleMultiplier,
          startPriceShift: priceCenterShift,
        };
      } else {
        setSelectedDrawingId(null);
        touchStateRef.current = {
          ...touchStateRef.current,
          mode: 'pan',
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          startPanOffset: panOffset,
          startPriceShift: priceCenterShift,
          initialPinchDistance: null,
        };
      }
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStateRef.current = {
        ...touchStateRef.current,
        mode: 'none',
        initialPinchDistance: dist,
        startVisibleCount: visibleCount,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (touchStateRef.current.mode === 'drag_drawing' && touchStateRef.current.dragDrawingId && e.touches.length === 1) {
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;
      const data = getWindowData();
      if (!data) return;
      const { mapper } = data;
      const currentMousePrice = mapper.getPriceFromY(y);
      const currentMouseTime = mapper.getTimeFromX(x);
      const deltaPrice = currentMousePrice - touchStateRef.current.startMousePrice;
      const deltaTime = currentMouseTime - touchStateRef.current.startMouseTime;

      setDrawings(prev => prev.map(d => {
        if (d.id === touchStateRef.current.dragDrawingId && !d.locked) {
          return {
            ...d,
            points: touchStateRef.current.startPoints.map(p => ({
              time: p.time + deltaTime,
              price: p.price + deltaPrice
            }))
          };
        }
        return d;
      }));
    } else if (touchStateRef.current.mode === 'drag_handle' && touchStateRef.current.dragDrawingId && e.touches.length === 1) {
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;
      const snapped = snapToCandle(x, y);
      setDrawings(prev => prev.map(d => {
        if (d.id === touchStateRef.current.dragDrawingId && touchStateRef.current.dragHandleIndex !== null) {
          const updated = [...d.points];
          updated[touchStateRef.current.dragHandleIndex] = snapped;
          return { ...d, points: updated };
        }
        return d;
      }));
    } else if (touchStateRef.current.mode === 'price_scale' && e.touches.length === 1) {
      const deltaY = touchStateRef.current.startY - e.touches[0].clientY;
      const sensitivity = 0.007;
      const newScale = Math.max(0.15, Math.min(8.0, touchStateRef.current.startPriceScale * Math.exp(deltaY * sensitivity)));
      setPriceScaleMultiplier(newScale);
    } else if (touchStateRef.current.mode === 'pan' && e.touches.length === 1) {
      const deltaX = e.touches[0].clientX - touchStateRef.current.startX;
      const deltaY = e.touches[0].clientY - touchStateRef.current.startY;

      const slotWidth = mainPlotWidth / visibleCount;
      const candleShift = Math.round(deltaX / slotWidth);
      const rawSeries = getCandleSeries(assetId, currentPrice || 2499.07, timeFrame);
      const maxOffset = Math.max(0, rawSeries.length - visibleCount);
      const newOffset = Math.max(-12, Math.min(maxOffset, touchStateRef.current.startPanOffset + candleShift));
      setPanOffset(newOffset);

      const verticalRatio = deltaY / mainPlotHeight;
      setPriceCenterShift(touchStateRef.current.startPriceShift + verticalRatio * (1.2 / Math.max(0.2, priceScaleMultiplier)));
    } else if (touchStateRef.current.initialPinchDistance && e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = touchStateRef.current.initialPinchDistance / dist;
      const newVisible = Math.round(touchStateRef.current.startVisibleCount * scale);
      setVisibleCount(Math.max(6, Math.min(320, newVisible)));
    }
  };

  const handleTouchEnd = () => {
    touchStateRef.current.mode = 'none';
    touchStateRef.current.initialPinchDistance = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      handleZoom(e.deltaY < 0);
    } else {
      const rawSeries = getCandleSeries(assetId, currentPrice || 2499.07, timeFrame);
      const maxOffset = Math.max(0, rawSeries.length - visibleCount);
      setPanOffset(prev => Math.max(-12, Math.min(maxOffset, prev + (e.deltaX > 0 ? 2 : -2))));
    }
  };

  const handlePointerLeave = () => {
    interactionRef.current.hoverX = null;
    interactionRef.current.hoverY = null;
    interactionRef.current.mode = 'none';
    setHoveredCandle(null);
  };

  const isDark = theme === 'dark';
  const decimals = getPrecision(currentPrice || 100);
  const fmt = (val: number | undefined | null) => (val !== undefined && val !== null ? val.toFixed(decimals) : '0.00');

  const isScaleModified = priceScaleMultiplier !== 1.0 || priceCenterShift !== 0 || panOffset !== 0 || visibleCount !== 32;
  const selectedDrawing = drawings.find(d => d.id === selectedDrawingId) || null;

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative select-none overflow-hidden touch-none ${
        isDark ? 'bg-[#0b1118]' : 'bg-white'
      } transition-colors duration-150`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onWheel={handleWheel}
      onPointerLeave={handlePointerLeave}
      style={{ cursor: cursorStyle }}
    >
      {/* Loading Skeleton */}
      {(!chartReady || isLoading) && (
        <div className={`absolute inset-0 z-40 flex flex-col items-center justify-center backdrop-blur-xs transition-opacity duration-300 ${
          isDark ? 'bg-[#0b1118]/85' : 'bg-white/85'
        }`}>
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-[#0088cc]/20 border-t-[#0088cc] animate-spin" />
            <span className="text-[10px] font-black tracking-widest text-[#0088cc] uppercase">
              Loading Feed
            </span>
          </div>
        </div>
      )}

      {/* 60FPS High-DPI Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full absolute inset-0 pointer-events-none"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Top OHLC & Candle Countdown HUD */}
      <div className="absolute top-2 left-2 z-20 pointer-events-none flex items-center gap-2">
        {hoveredCandle ? (
          <div className={`flex items-center gap-2 text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow-xs ${
            isDark ? 'bg-slate-900/80 text-slate-300' : 'bg-white/80 text-slate-600'
          }`}>
            <span>O:{fmt(hoveredCandle.open)}</span>
            <span>H:{fmt(hoveredCandle.high)}</span>
            <span>L:{fmt(hoveredCandle.low)}</span>
            <span className={hoveredCandle.close >= hoveredCandle.open ? 'text-[#00b067]' : 'text-[#ff3b30]'}>
              C:{fmt(hoveredCandle.close)}
            </span>
          </div>
        ) : (
          <div className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded shadow-xs ${
            isDark ? 'bg-slate-900/80 text-slate-300' : 'bg-white/80 text-slate-600'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00b067] animate-pulse" />
            <span>{timeFrame}</span>
            <span className="text-gray-300">|</span>
            <span className="font-mono text-[#0088cc] dark:text-[#38bdf8]">
              {candleCountdown < 10 ? `0${candleCountdown}` : candleCountdown}s
            </span>
          </div>
        )}
      </div>

      {/* Top Floating Drawing Tools Palette */}
      <DrawingToolsBar
        activeTool={activeDrawingTool}
        onSelectTool={(tool) => {
          setActiveDrawingTool(tool);
          setInProgressPoints([]);
        }}
        magnetMode={magnetMode}
        onToggleMagnet={() => {
          const next = !magnetMode;
          setMagnetMode(next);
          localStorage.setItem('chart_magnet_mode', String(next));
        }}
        drawingsCount={drawings.length}
        onClearDrawings={() => {
          setDrawings([]);
          setSelectedDrawingId(null);
          setInProgressPoints([]);
        }}
        hideAllDrawings={hideAllDrawings}
        onToggleHideAllDrawings={() => setHideAllDrawings(!hideAllDrawings)}
        theme={theme}
      />

      {/* Selected Drawing Floating Action Toolbar (Color, Thickness, Styles, Lock, Duplicate, Delete) */}
      <SelectedDrawingToolbar
        drawing={selectedDrawing}
        onUpdateDrawing={(updated) => {
          setDrawings(prev => prev.map(d => d.id === updated.id ? updated : d));
        }}
        onDeleteDrawing={(id) => {
          setDrawings(prev => prev.filter(d => d.id !== id));
          setSelectedDrawingId(null);
        }}
        onCloneDrawing={handleCloneDrawing}
        onDeselect={() => setSelectedDrawingId(null)}
        theme={theme}
      />

      {/* Floating Zoom & Auto Scale Reset Pad */}
      <div className="absolute bottom-6 left-2 z-20 flex items-center gap-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border border-gray-200 dark:border-slate-700 p-0.5 rounded-lg shadow-md pointer-events-auto">
        <button
          onClick={() => handleZoom(true)}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleZoom(false)}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        {isScaleModified && (
          <button
            onClick={handleResetAll}
            className="flex items-center gap-1 px-1.5 py-1 rounded bg-blue-50 dark:bg-blue-950 text-[#0088cc] dark:text-[#38bdf8] text-[9px] font-black transition-all cursor-pointer"
            title="Auto-Center Live View"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Auto</span>
          </button>
        )}
      </div>

      {/* Floating Jump to Live Indicator when Panned to History */}
      {panOffset > 8 && (
        <button
          onClick={handleResetAll}
          className="absolute bottom-6 right-20 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#0088cc] hover:bg-[#0077b5] text-white text-[11px] font-black shadow-lg shadow-blue-500/25 animate-in fade-in zoom-in duration-200 cursor-pointer active:scale-95 transition-all"
          title="Jump to Latest Live Candles"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Live View →</span>
        </button>
      )}
    </div>
  );
});

CandlestickChart.displayName = 'CandlestickChart';
