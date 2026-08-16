import { describe, it, expect } from 'vitest';
import { niceTicks, linear } from '../src/charts/lib/scale.js';
import { linePath, areaPath, arcPath, polar, radarPath, funnelPath, fmtNum } from '../src/charts/lib/geometry.js';

describe('charts 内核 scale', () => {
  it('niceTicks 归整为好看刻度（0-103 → 步长 25）', () => {
    const { ticks } = niceTicks(0, 103, 5);
    expect(ticks[0]).toBe(0);
    expect(ticks[1] - ticks[0]).toBe(25);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(103);
  });

  it('niceTicks min===max 时扩展区间', () => {
    const { ticks, min, max } = niceTicks(5, 5, 5);
    expect(min).toBeLessThan(5);
    expect(max).toBeGreaterThan(5);
    expect(ticks.length).toBeGreaterThanOrEqual(2);
  });

  it('niceTicks 非数值输入兜底', () => {
    const { ticks } = niceTicks(NaN, 10);
    expect(ticks.length).toBe(2);
  });

  it('linear 线性映射（y 轴反向）', () => {
    const y = linear(0, 100, 200, 0);
    expect(y(0)).toBe(200);
    expect(y(100)).toBe(0);
    expect(y(50)).toBe(100);
  });

  it('linear 退化 domain 不除零', () => {
    const y = linear(5, 5, 0, 100);
    expect(y(5)).toBe(0);
  });
});

describe('charts 内核 geometry', () => {
  it('linePath 折线 path', () => {
    expect(linePath([[0, 0], [10, 10], [20, 5]])).toBe('M0,0L10,10L20,5');
  });

  it('linePath smooth 生成贝塞尔曲线段', () => {
    const d = linePath([[0, 0], [10, 10], [20, 5], [30, 8]], { smooth: true });
    expect(d).toMatch(/^M0,0C/);
    expect(d).not.toContain('L');
  });

  it('areaPath 闭合到基线', () => {
    const d = areaPath([[0, 10], [10, 20]], 100);
    expect(d).toBe('M0,10L10,20L10,100L0,100Z');
  });

  it('arcPath 饼扇区（r0=0）从圆心出发', () => {
    const d = arcPath(50, 50, 40, 0, 0, Math.PI / 2);
    expect(d.startsWith('M50,50')).toBe(true);
    expect(d).toContain('A40,40');
    expect(d.endsWith('Z')).toBe(true);
  });

  it('arcPath 环形扇区含内弧回线', () => {
    const d = arcPath(50, 50, 40, 24, 0, Math.PI / 2);
    expect(d).toContain('A24,24');
    expect(d.startsWith('M')).toBe(true);
  });

  it('arcPath 整圆拆两段', () => {
    const d = arcPath(50, 50, 40, 20, 0, Math.PI * 2);
    expect(d.match(/A40,40/g).length).toBe(2); // 两个半环的外弧
    expect(d.match(/A20,20/g).length).toBe(2); // 两个半环的内弧
  });

  it('arcPath 跨角为 0 返回空串', () => {
    expect(arcPath(50, 50, 40, 0, 1, 1)).toBe('');
  });

  it('polar 12 点方向为正上方', () => {
    const [x, y] = polar(50, 50, 10, 0);
    expect(x).toBeCloseTo(50);
    expect(y).toBeCloseTo(40);
  });

  it('radarPath 多边形闭合（0=12 点顺时针）', () => {
    const angles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    const d = radarPath(50, 50, 40, angles, [1, 0.5, 1, 0.5]);
    expect(d.startsWith('M50,10')).toBe(true); // 首顶点：12 点方向满半径
    expect(d.match(/L/g).length).toBe(3);
    expect(d.endsWith('Z')).toBe(true);
  });

  it('radarPath 空角度返回空串', () => {
    expect(radarPath(50, 50, 40, [], [])).toBe('');
  });

  it('funnelPath 居中梯形', () => {
    const d = funnelPath(160, 10, 100, 50, 20);
    expect(d).toBe('M110,10L210,10L185,30L135,30Z');
  });

  it('fmtNum 大数缩写', () => {
    expect(fmtNum(15000)).toBe('1.5万');
    expect(fmtNum(200000000)).toBe('2亿');
    expect(fmtNum(123)).toBe('123');
    expect(fmtNum(1.23456)).toBe('1.23');
  });
});
