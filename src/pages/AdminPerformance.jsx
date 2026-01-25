import { useEffect, useState, useMemo, useRef } from 'react';
import React from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getInstrumentByCode } from '../config/instruments';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import './Admin.css';

const AdminPerformance = () => {
  const [users, setUsers] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [weeklyBalances, setWeeklyBalances] = useState([]);
  const [balances, setBalances] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPair, setSelectedPair] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [sortBy, setSortBy] = useState('balance');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterText, setFilterText] = useState('');

  // Chart refs
  const popularPairsChartRef = useRef(null);
  const weeklyReturnsChartRef = useRef(null);
  const userBalanceChartRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [usersSnap, allocationsSnap, weeklyBalancesSnap, balancesSnap, weeksSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'allocations')),
        getDocs(collection(db, 'weeklyBalances')),
        getDocs(collection(db, 'balances')),
        getDocs(query(collection(db, 'weeks'), where('status', '==', 'settled'), orderBy('endDate', 'desc'), limit(4)))
          .catch(() => getDocs(collection(db, 'weeks')))
      ]);

      const usersData = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() }));
      const allocationsData = allocationsSnap.docs.map(d => d.data());
      const weeklyBalancesData = weeklyBalancesSnap.docs.map(d => d.data());
      const balancesData = balancesSnap.docs.map(d => ({ uid: d.id, ...d.data() }));
      
      let weeksData = weeksSnap.docs.map(d => d.data());
      if (weeksData.length > 0 && !weeksData[0].endDate?.toDate) {
        weeksData = weeksData
          .filter(w => w.endDate)
          .sort((a, b) => {
            const aDate = a.endDate?.toDate ? a.endDate.toDate() : new Date(a.endDate);
            const bDate = b.endDate?.toDate ? b.endDate.toDate() : new Date(b.endDate);
            return bDate - aDate;
          })
          .slice(0, 4);
      }
      weeksData.sort((a, b) => (a.id || '').localeCompare(b.id || ''));

      setUsers(usersData);
      setAllocations(allocationsData);
      setWeeklyBalances(weeklyBalancesData);
      setBalances(balancesData);
      setWeeks(weeksData);
    } catch (error) {
      console.error('Failed to load performance data:', error);
      setError(error?.message || 'Veri yüklenemedi. Admin erişimi ve Firestore kurallarını kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate KPIs - Client Side
  const kpis = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = allocations.reduce((acc, a) => {
      if (!acc.has(a.uid)) acc.add(a.uid);
      return acc;
    }, new Set()).size;
    const totalAllocations = allocations.length;
    const totalWeeks = weeks.length;
    const totalBalance = balances.reduce((sum, b) => sum + (Number(b.balance || b.latestBalance) || 0), 0);
    const avgBalance = totalUsers > 0 ? totalBalance / totalUsers : 0;
    const avgAllocationsPerUser = activeUsers > 0 ? totalAllocations / activeUsers : 0;
    const usersWithBalance = balances.filter(b => Number(b.balance || b.latestBalance || 0) > 0).length;

    return { 
      totalUsers, 
      activeUsers, 
      totalAllocations, 
      totalWeeks, 
      totalBalance,
      avgBalance,
      avgAllocationsPerUser,
      usersWithBalance
    };
  }, [users, allocations, weeks, balances]);

  // Most popular pairs (all time) - Client Side
  const mostPopularPairs = useMemo(() => {
    const pairMap = {};
    allocations.forEach(alloc => {
      if (alloc.pairs && typeof alloc.pairs === 'object') {
        Object.entries(alloc.pairs).forEach(([pair, weight]) => {
          if (!pairMap[pair]) {
            pairMap[pair] = { totalWeight: 0, count: 0 };
          }
          pairMap[pair].totalWeight += Number(weight) || 0;
          pairMap[pair].count += 1;
        });
      }
    });

    return Object.entries(pairMap)
      .map(([pair, stats]) => ({
        pair,
        totalWeight: stats.totalWeight,
        allocationCount: stats.count,
        avgWeight: stats.count > 0 ? stats.totalWeight / stats.count : 0
      }))
      .sort((a, b) => b.totalWeight - a.totalWeight)
      .slice(0, 20);
  }, [allocations]);

  // Average returns by week - Client Side
  const avgReturnsByWeek = useMemo(() => {
    const weekMap = {};
    const weekIds = weeks.map(w => w.id).filter(Boolean);

    weeklyBalances.forEach(wb => {
      if (weekIds.includes(wb.weekId)) {
        const returnValue = Number(wb.return || wb.resultReturnPct) || 0;
        if (!weekMap[wb.weekId]) {
          weekMap[wb.weekId] = { total: 0, count: 0 };
        }
        weekMap[wb.weekId].total += returnValue;
        weekMap[wb.weekId].count += 1;
      }
    });

    return weekIds
      .map(weekId => ({
        weekId,
        avgReturn: weekMap[weekId] ? weekMap[weekId].total / weekMap[weekId].count : 0,
        userCount: weekMap[weekId]?.count || 0
      }))
      .filter(item => item.userCount > 0)
      .sort((a, b) => (a.weekId || '').localeCompare(b.weekId || ''));
  }, [weeklyBalances, weeks]);

  // Top 10% users by balance - Client Side
  const top10Percent = useMemo(() => {
    const usersWithBalance = users
      .map(u => {
        const balance = balances.find(b => b.uid === u.uid);
        return {
          uid: u.uid,
          username: u.username || 'N/A',
          email: u.email || 'N/A',
          balance: Number(balance?.balance || balance?.latestBalance || 0)
        };
      })
      .filter(u => u.balance > 0)
      .sort((a, b) => b.balance - a.balance);

    const top10Count = Math.max(1, Math.ceil(usersWithBalance.length * 0.1));
    return usersWithBalance.slice(0, top10Count);
  }, [users, balances]);

  // Users by allocation count - Client Side
  const usersByAllocationCount = useMemo(() => {
    const userMap = {};
    allocations.forEach(alloc => {
      if (!userMap[alloc.uid]) {
        userMap[alloc.uid] = { uid: alloc.uid, count: 0 };
      }
      userMap[alloc.uid].count += 1;
    });

    return Object.values(userMap)
      .map(item => {
        const user = users.find(u => u.uid === item.uid);
        const balance = balances.find(b => b.uid === item.uid);
        return {
          uid: item.uid,
          username: user?.username || 'N/A',
          email: user?.email || 'N/A',
          allocationCount: item.count,
          balance: Number(balance?.balance || balance?.latestBalance || 0)
        };
      })
      .sort((a, b) => b.allocationCount - a.allocationCount);
  }, [allocations, users, balances]);

  // Users by win rate - Client Side
  const usersByWinRate = useMemo(() => {
    const userMap = {};
    const weekIds = weeks.map(w => w.id).filter(Boolean);

    weeklyBalances.forEach(wb => {
      if (weekIds.includes(wb.weekId)) {
        if (!userMap[wb.uid]) {
          userMap[wb.uid] = { wins: 0, total: 0 };
        }
        userMap[wb.uid].total += 1;
        const returnValue = Number(wb.return || wb.resultReturnPct) || 0;
        if (returnValue > 0) {
          userMap[wb.uid].wins += 1;
        }
      }
    });

    return Object.entries(userMap)
      .filter(([_, stats]) => stats.total >= 3)
      .map(([uid, stats]) => {
        const user = users.find(u => u.uid === uid);
        const balance = balances.find(b => b.uid === uid);
        return {
          uid,
          username: user?.username || 'N/A',
          email: user?.email || 'N/A',
          winRate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0,
          wins: stats.wins,
          total: stats.total,
          balance: Number(balance?.balance || balance?.latestBalance || 0)
        };
      })
      .sort((a, b) => b.winRate - a.winRate);
  }, [weeklyBalances, weeks, users, balances]);

  // Pairs by week - Client Side
  const pairsByWeek = useMemo(() => {
    const weekMap = {};
    const weekIds = weeks.map(w => w.id).filter(Boolean);

    allocations.forEach(alloc => {
      if (weekIds.includes(alloc.weekId) && alloc.pairs && typeof alloc.pairs === 'object') {
        if (!weekMap[alloc.weekId]) {
          weekMap[alloc.weekId] = {};
        }
        Object.entries(alloc.pairs).forEach(([pair, weight]) => {
          if (!weekMap[alloc.weekId][pair]) {
            weekMap[alloc.weekId][pair] = { totalWeight: 0, count: 0 };
          }
          weekMap[alloc.weekId][pair].totalWeight += Number(weight) || 0;
          weekMap[alloc.weekId][pair].count += 1;
        });
      }
    });

    return weekMap;
  }, [allocations, weeks]);

  // Pair preference lists - Client Side
  const pairPreferenceLists = useMemo(() => {
    const pairMap = {};

    allocations.forEach(alloc => {
      if (alloc.pairs && typeof alloc.pairs === 'object') {
        Object.entries(alloc.pairs).forEach(([pair, weight]) => {
          if (!pairMap[pair]) {
            pairMap[pair] = {};
          }
          if (!pairMap[pair][alloc.uid]) {
            pairMap[pair][alloc.uid] = { count: 0, totalWeight: 0, maxWeight: 0 };
          }
          pairMap[pair][alloc.uid].count += 1;
          const w = Number(weight) || 0;
          pairMap[pair][alloc.uid].totalWeight += w;
          if (w > pairMap[pair][alloc.uid].maxWeight) {
            pairMap[pair][alloc.uid].maxWeight = w;
          }
        });
      }
    });

    const result = {};
    Object.entries(pairMap).forEach(([pair, userMap]) => {
      result[pair] = Object.entries(userMap)
        .map(([uid, stats]) => {
          const user = users.find(u => u.uid === uid);
          return {
            uid,
            username: user?.username || 'N/A',
            email: user?.email || 'N/A',
            count: stats.count,
            totalWeight: stats.totalWeight,
            maxWeight: stats.maxWeight,
            avgWeight: stats.count > 0 ? stats.totalWeight / stats.count : 0
          };
        })
        .sort((a, b) => b.totalWeight - a.totalWeight);
    });

    return result;
  }, [allocations, users]);

  // Top pairs by week (most popular per week)
  const topPairsByWeek = useMemo(() => {
    const weekPairs = {};
    const weekIds = weeks.map(w => w.id).filter(Boolean);

    weekIds.forEach(weekId => {
      if (pairsByWeek[weekId]) {
        const pairs = Object.entries(pairsByWeek[weekId])
          .map(([pair, stats]) => ({
            pair,
            totalWeight: stats.totalWeight,
            count: stats.count,
            avgWeight: stats.count > 0 ? stats.totalWeight / stats.count : 0
          }))
          .sort((a, b) => b.totalWeight - a.totalWeight)
          .slice(0, 5);
        weekPairs[weekId] = pairs;
      }
    });

    return weekPairs;
  }, [pairsByWeek, weeks]);

  // Users by total weight allocated (most weight given)
  const usersByTotalWeight = useMemo(() => {
    const userWeightMap = {};

    allocations.forEach(alloc => {
      if (alloc.pairs && typeof alloc.pairs === 'object') {
        if (!userWeightMap[alloc.uid]) {
          userWeightMap[alloc.uid] = { totalWeight: 0, pairCount: 0, maxSingleWeight: 0 };
        }
        let allocTotal = 0;
        Object.values(alloc.pairs).forEach(weight => {
          const w = Number(weight) || 0;
          allocTotal += w;
          if (w > userWeightMap[alloc.uid].maxSingleWeight) {
            userWeightMap[alloc.uid].maxSingleWeight = w;
          }
        });
        userWeightMap[alloc.uid].totalWeight += allocTotal;
        userWeightMap[alloc.uid].pairCount += Object.keys(alloc.pairs).length;
      }
    });

    return Object.entries(userWeightMap)
      .map(([uid, stats]) => {
        const user = users.find(u => u.uid === uid);
        const balance = balances.find(b => b.uid === uid);
        return {
          uid,
          username: user?.username || 'N/A',
          email: user?.email || 'N/A',
          totalWeight: stats.totalWeight,
          pairCount: stats.pairCount,
          maxSingleWeight: stats.maxSingleWeight,
          balance: Number(balance?.balance || balance?.latestBalance || 0)
        };
      })
      .sort((a, b) => b.totalWeight - a.totalWeight);
  }, [allocations, users, balances]);

  // Top gainers and losers (by weekly returns)
  const topGainersLosers = useMemo(() => {
    const weekIds = weeks.map(w => w.id).filter(Boolean);
    const userReturns = {};

    weeklyBalances.forEach(wb => {
      if (weekIds.includes(wb.weekId)) {
        if (!userReturns[wb.uid]) {
          userReturns[wb.uid] = { totalReturn: 0, weeks: 0, wins: 0, losses: 0 };
        }
        const returnValue = Number(wb.return || wb.resultReturnPct) || 0;
        userReturns[wb.uid].totalReturn += returnValue;
        userReturns[wb.uid].weeks += 1;
        if (returnValue > 0) userReturns[wb.uid].wins += 1;
        if (returnValue < 0) userReturns[wb.uid].losses += 1;
      }
    });

    const withReturns = Object.entries(userReturns)
      .map(([uid, stats]) => {
        const user = users.find(u => u.uid === uid);
        const balance = balances.find(b => b.uid === uid);
        return {
          uid,
          username: user?.username || 'N/A',
          email: user?.email || 'N/A',
          totalReturn: stats.totalReturn,
          avgReturn: stats.weeks > 0 ? stats.totalReturn / stats.weeks : 0,
          weeks: stats.weeks,
          wins: stats.wins,
          losses: stats.losses,
          balance: Number(balance?.balance || balance?.latestBalance || 0)
        };
      })
      .filter(u => u.weeks > 0);

    return {
      topGainers: [...withReturns].sort((a, b) => b.totalReturn - a.totalReturn).slice(0, 20),
      topLosers: [...withReturns].sort((a, b) => a.totalReturn - b.totalReturn).slice(0, 20)
    };
  }, [weeklyBalances, weeks, users, balances]);

  // Unique pairs count and diversity
  const pairDiversity = useMemo(() => {
    const uniquePairs = new Set();
    allocations.forEach(alloc => {
      if (alloc.pairs && typeof alloc.pairs === 'object') {
        Object.keys(alloc.pairs).forEach(pair => uniquePairs.add(pair));
      }
    });
    return uniquePairs.size;
  }, [allocations]);

  // Most active users (by week participation)
  const mostActiveUsers = useMemo(() => {
    const weekIds = weeks.map(w => w.id).filter(Boolean);
    const userActivity = {};

    allocations.forEach(alloc => {
      if (weekIds.includes(alloc.weekId)) {
        if (!userActivity[alloc.uid]) {
          userActivity[alloc.uid] = { weeks: new Set(), allocations: 0 };
        }
        userActivity[alloc.uid].weeks.add(alloc.weekId);
        userActivity[alloc.uid].allocations += 1;
      }
    });

    return Object.entries(userActivity)
      .map(([uid, stats]) => {
        const user = users.find(u => u.uid === uid);
        const balance = balances.find(b => b.uid === uid);
        return {
          uid,
          username: user?.username || 'N/A',
          email: user?.email || 'N/A',
          weekCount: stats.weeks.size,
          allocationCount: stats.allocations,
          participationRate: weekIds.length > 0 ? (stats.weeks.size / weekIds.length) * 100 : 0,
          balance: Number(balance?.balance || balance?.latestBalance || 0)
        };
      })
      .sort((a, b) => b.weekCount - a.weekCount || b.allocationCount - a.allocationCount);
  }, [allocations, weeks, users, balances]);

  // User segments (by balance ranges)
  const userSegments = useMemo(() => {
    const segments = {
      high: { min: 150000, count: 0, total: 0 },
      medium: { min: 100000, max: 150000, count: 0, total: 0 },
      low: { min: 0, max: 100000, count: 0, total: 0 }
    };

    balances.forEach(b => {
      const balance = Number(b.balance || b.latestBalance || 0);
      if (balance >= segments.high.min) {
        segments.high.count++;
        segments.high.total += balance;
      } else if (balance >= segments.medium.min && balance < segments.medium.max) {
        segments.medium.count++;
        segments.medium.total += balance;
      } else if (balance > 0) {
        segments.low.count++;
        segments.low.total += balance;
      }
    });

    return {
      high: { ...segments.high, avg: segments.high.count > 0 ? segments.high.total / segments.high.count : 0 },
      medium: { ...segments.medium, avg: segments.medium.count > 0 ? segments.medium.total / segments.medium.count : 0 },
      low: { ...segments.low, avg: segments.low.count > 0 ? segments.low.total / segments.low.count : 0 }
    };
  }, [balances]);

  // Risk analysis (users with high concentration)
  const highRiskUsers = useMemo(() => {
    return usersByTotalWeight
      .filter(u => u.maxSingleWeight > 0.5) // More than 50% in single pair
      .map(u => ({
        ...u,
        riskLevel: u.maxSingleWeight > 0.8 ? 'Yüksek' : u.maxSingleWeight > 0.6 ? 'Orta' : 'Düşük'
      }))
      .sort((a, b) => b.maxSingleWeight - a.maxSingleWeight);
  }, [usersByTotalWeight]);

  // Weekly trend analysis
  const weeklyTrends = useMemo(() => {
    const weekIds = weeks.map(w => w.id).filter(Boolean).sort();
    if (weekIds.length < 2) return null;

    const trends = weekIds.map((weekId, idx) => {
      const weekData = pairsByWeek[weekId] || {};
      const pairCount = Object.keys(weekData).length;
      const totalWeight = Object.values(weekData).reduce((sum, stats) => sum + stats.totalWeight, 0);
      const avgReturn = avgReturnsByWeek.find(w => w.weekId === weekId)?.avgReturn || 0;
      const userCount = avgReturnsByWeek.find(w => w.weekId === weekId)?.userCount || 0;

      return {
        weekId,
        pairCount,
        totalWeight,
        avgReturn,
        userCount,
        trend: idx > 0 ? (avgReturn - (avgReturnsByWeek.find(w => w.weekId === weekIds[idx - 1])?.avgReturn || 0)) : 0
      };
    });

    return trends;
  }, [weeks, pairsByWeek, avgReturnsByWeek]);

  // Pair concentration (diversity index)
  const pairConcentration = useMemo(() => {
    const pairUsage = {};
    allocations.forEach(alloc => {
      if (alloc.pairs && typeof alloc.pairs === 'object') {
        Object.keys(alloc.pairs).forEach(pair => {
          pairUsage[pair] = (pairUsage[pair] || 0) + 1;
        });
      }
    });

    const total = Object.values(pairUsage).reduce((sum, count) => sum + count, 0);
    const uniquePairs = Object.keys(pairUsage).length;
    const concentration = uniquePairs > 0 ? total / uniquePairs : 0;
    const top3Share = Object.values(pairUsage)
      .sort((a, b) => b - a)
      .slice(0, 3)
      .reduce((sum, count) => sum + count, 0) / total * 100;

    return {
      uniquePairs,
      totalUsage: total,
      avgUsagePerPair: concentration,
      top3Share,
      herfindahlIndex: Object.values(pairUsage).reduce((sum, count) => {
        const share = count / total;
        return sum + (share * share);
      }, 0) * 100 // 0-100 scale
    };
  }, [allocations]);

  // Filtered and sorted users - Client Side
  const filteredUsers = useMemo(() => {
    let filtered = [...usersByAllocationCount];

    if (filterText) {
      const search = filterText.toLowerCase();
      filtered = filtered.filter(u => 
        (u.username || u.uid || '').toLowerCase().includes(search) || 
        (u.email || '').toLowerCase().includes(search)
      );
    }

    if (sortBy === 'balance') {
      filtered.sort((a, b) => {
        return sortOrder === 'desc' ? b.balance - a.balance : a.balance - b.balance;
      });
    } else if (sortBy === 'allocations') {
      filtered.sort((a, b) => 
        sortOrder === 'desc' ? b.allocationCount - a.allocationCount : a.allocationCount - b.allocationCount
      );
    }

    return filtered;
  }, [usersByAllocationCount, filterText, sortBy, sortOrder]);

  // Chart: Popular Pairs
  useEffect(() => {
    if (activeTab !== 'pairs' || !mostPopularPairs.length) return;
    const container = popularPairsChartRef.current;
    if (!container) return;

    const top10 = mostPopularPairs.slice(0, 10);
    const labels = top10.map(p => p.pair);
    const values = top10.map(p => p.totalWeight * 100);

    const x = labels.map((_, i) => i);
    const y = values;

    const width = Math.max(400, container.clientWidth || 400);
    const height = 300;

    const opts = {
      width,
      height,
      series: [
        { label: 'Pair' },
        { 
          label: 'Total Weight (%)',
          stroke: '#3b82f6',
          fill: 'rgba(59, 130, 246, 0.1)',
          width: 2,
          points: { show: true, size: 4 }
        }
      ],
      axes: [
        {
          show: true,
          stroke: '#e5e7eb',
          grid: { show: true, stroke: '#f3f4f6' },
          ticks: { show: true, stroke: '#9ca3af' },
          side: 2,
          labelGap: 8,
          labelSize: 11,
          labelFont: '11px system-ui',
          label: 'Parite',
          space: (u, seriesIdx, scaleMin, scaleMax, plotDim) => {
            const maxLabelWidth = Math.max(...labels.map(l => l.length * 7));
            return Math.max(40, maxLabelWidth);
          },
          values: (u, vals) => vals.map(v => labels[Math.round(v)] || '')
        },
        {
          show: true,
          stroke: '#e5e7eb',
          grid: { show: true, stroke: '#f3f4f6' },
          ticks: { show: true, stroke: '#9ca3af' },
          side: 3,
          labelGap: 8,
          labelSize: 11,
          labelFont: '11px system-ui',
          label: 'Toplam Ağırlık (%)',
          format: (u, val) => val.toFixed(1) + '%'
        }
      ],
      legend: { show: false },
      padding: [12, 12, 8, 8],
      cursor: { show: true, lock: true }
    };

    let chart = null;
    try {
      chart = new uPlot(opts, [x, y], container);
    } catch (e) {
      console.error('Chart error:', e);
    }

    return () => {
      if (chart) {
        try {
          chart.destroy();
        } catch (e) {
          console.warn('Chart destroy error:', e);
        }
      }
    };
  }, [activeTab, mostPopularPairs]);

  // Chart: Weekly Returns
  useEffect(() => {
    if (activeTab !== 'overview' || !avgReturnsByWeek.length) return;
    const container = weeklyReturnsChartRef.current;
    if (!container) return;

    const labels = avgReturnsByWeek.map(w => w.weekId);
    const returns = avgReturnsByWeek.map(w => w.avgReturn);

    const x = labels.map((_, i) => i);
    const y = returns;

    const width = Math.max(400, container.clientWidth || 400);
    const height = 250;

    const opts = {
      width,
      height,
      series: [
        { label: 'Week' },
        { 
          label: 'Avg Return (%)',
          stroke: '#10b981',
          fill: (u) => {
            const ctx = u.ctx;
            const g = ctx.createLinearGradient(0, u.bbox.top, 0, u.bbox.top + u.bbox.height);
            g.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
            g.addColorStop(1, 'rgba(16, 185, 129, 0)');
            return g;
          },
          width: 2,
          points: { show: true, size: 5 }
        }
      ],
      axes: [
        {
          show: true,
          stroke: '#e5e7eb',
          grid: { show: true, stroke: '#f3f4f6' },
          ticks: { show: true, stroke: '#9ca3af' },
          side: 2,
          labelGap: 8,
          labelSize: 11,
          labelFont: '11px system-ui',
          label: 'Hafta',
          space: 60,
          values: (u, vals) => vals.map(v => labels[Math.round(v)] || '')
        },
        {
          show: true,
          stroke: '#e5e7eb',
          grid: { show: true, stroke: '#f3f4f6' },
          ticks: { show: true, stroke: '#9ca3af' },
          side: 3,
          labelGap: 8,
          labelSize: 11,
          labelFont: '11px system-ui',
          label: 'Ortalama Getiri (%)',
          format: (u, val) => (val >= 0 ? '+' : '') + val.toFixed(2) + '%'
        }
      ],
      legend: { show: false },
      padding: [12, 12, 8, 8],
      cursor: { show: true, lock: true }
    };

    let chart = null;
    try {
      chart = new uPlot(opts, [x, y], container);
    } catch (e) {
      console.error('Chart error:', e);
    }

    return () => {
      if (chart) {
        try {
          chart.destroy();
        } catch (e) {
          console.warn('Chart destroy error:', e);
        }
      }
    };
  }, [activeTab, avgReturnsByWeek]);

  // Chart: Top Users Balance
  useEffect(() => {
    if (activeTab !== 'users' || !top10Percent.length) return;
    const container = userBalanceChartRef.current;
    if (!container) return;

    let chart = null;
    let timer = null;

    // Wait for container to be ready
    timer = setTimeout(() => {
      if (!container || !container.parentElement) return;

      const top20 = top10Percent.slice(0, 20);
      if (top20.length === 0) return;

      const labels = top20.map(u => u.username || 'N/A');
      const values = top20.map(u => Number(u.balance) || 0).filter(v => v > 0);

      if (values.length === 0) return;

      const x = values.map((_, i) => i);
      const y = values;

      const width = Math.max(400, container.clientWidth || 400);
      const height = 300;

      const opts = {
        width,
        height,
        series: [
          { label: 'User' },
          { 
            label: 'Balance',
            stroke: '#8b5cf6',
            fill: 'rgba(139, 92, 246, 0.1)',
            width: 2,
            points: { show: true, size: 4 }
          }
        ],
        axes: [
          {
            show: true,
            stroke: '#e5e7eb',
            grid: { show: true, stroke: '#f3f4f6' },
            ticks: { show: true, stroke: '#9ca3af' },
            side: 2,
            labelGap: 8,
            labelSize: 11,
            labelFont: '11px system-ui',
            label: 'Kullanıcı',
            space: (u, seriesIdx, scaleMin, scaleMax, plotDim) => {
              const maxLabelWidth = Math.max(...labels.map(l => (l.length || 0) * 6));
              return Math.max(50, maxLabelWidth);
            },
            values: (u, vals) => vals.map(v => labels[Math.round(v)] || '')
          },
          {
            show: true,
            stroke: '#e5e7eb',
            grid: { show: true, stroke: '#f3f4f6' },
            ticks: { show: true, stroke: '#9ca3af' },
            side: 3,
            labelGap: 8,
            labelSize: 11,
            labelFont: '11px system-ui',
            label: 'Bakiye (₺)',
            format: (u, val) => {
              if (val >= 1e6) return `₺${(val / 1e6).toFixed(1)}M`;
              if (val >= 1e3) return `₺${(val / 1e3).toFixed(0)}k`;
              return `₺${val.toFixed(0)}`;
            }
          }
        ],
        legend: { show: false },
        padding: [12, 12, 8, 8],
        cursor: { show: true, lock: true },
        scales: {
          x: { time: false },
          y: { auto: true }
        }
      };

      try {
        chart = new uPlot(opts, [x, y], container);
      } catch (e) {
        console.error('Chart error:', e);
      }
    }, 100);

    return () => {
      if (timer) clearTimeout(timer);
      if (chart) {
        try {
          chart.destroy();
        } catch (e) {
          console.warn('Chart destroy error:', e);
        }
      }
    };
  }, [activeTab, top10Percent]);

  const formatMoney = (n) => {
    const num = Number(n);
    return Number.isFinite(num) ? `₺${num.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}` : '—';
  };

  const formatPct = (n) => {
    const num = Number(n);
    return Number.isFinite(num) ? `${num >= 0 ? '+' : ''}${num.toFixed(2)}%` : '—';
  };

  const weekOptions = Object.keys(pairsByWeek).sort().reverse();

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-header">
          <div className="admin-header-content">
            <h1>Performans Analizi</h1>
            <div className="admin-nav">
              <Link to="/admin" className="admin-nav-link">Ana Sayfa</Link>
              <Link to="/admin/users" className="admin-nav-link">Kullanıcılar</Link>
              <Link to="/admin/actions" className="admin-nav-link">Actions</Link>
              <Link to="/admin/logs" className="admin-nav-link">Logs</Link>
            </div>
          </div>
        </div>
        <div className="admin-content">
          <div className="admin-card">
            <div className="admin-loading">Yükleniyor...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-container">
        <div className="admin-header">
          <div className="admin-header-content">
            <h1>Performans Analizi</h1>
            <div className="admin-nav">
              <Link to="/admin" className="admin-nav-link">Ana Sayfa</Link>
              <Link to="/admin/users" className="admin-nav-link">Kullanıcılar</Link>
              <Link to="/admin/actions" className="admin-nav-link">Actions</Link>
              <Link to="/admin/logs" className="admin-nav-link">Logs</Link>
            </div>
          </div>
        </div>
        <div className="admin-content">
          <div className="admin-card">
            <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
              <p style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>⚠️ {error}</p>
              <button className="admin-btn admin-btn-primary" onClick={loadData}>
                Tekrar Dene
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div className="admin-header-content">
          <h1>Performans Analizi</h1>
          <div className="admin-nav">
            <Link to="/admin" className="admin-nav-link">Ana Sayfa</Link>
            <Link to="/admin/users" className="admin-nav-link">Kullanıcılar</Link>
            <Link to="/admin/actions" className="admin-nav-link">Actions</Link>
            <Link to="/admin/logs" className="admin-nav-link">Logs</Link>
          </div>
        </div>
      </div>

      <div className="admin-content">
        {/* KPIs - Compact Cards */}
        <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Toplam Kullanıcı</div>
            <div className="admin-stat-value">{kpis.totalUsers}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Aktif Kullanıcı</div>
            <div className="admin-stat-value">{kpis.activeUsers}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Toplam Allocation</div>
            <div className="admin-stat-value">{kpis.totalAllocations}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Ortalama Allocation/Kullanıcı</div>
            <div className="admin-stat-value">{kpis.avgAllocationsPerUser.toFixed(1)}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Toplam Bakiye</div>
            <div className="admin-stat-value">{formatMoney(kpis.totalBalance)}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Ortalama Bakiye</div>
            <div className="admin-stat-value">{formatMoney(kpis.avgBalance)}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Bakiye Olan Kullanıcı</div>
            <div className="admin-stat-value">{kpis.usersWithBalance}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Farklı Parite Sayısı</div>
            <div className="admin-stat-value">{pairDiversity}</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid #e5e7eb', overflowX: 'auto' }}>
          {[
            { id: 'overview', label: 'Genel Bakış' },
            { id: 'pairs', label: 'Pariteler' },
            { id: 'users', label: 'Kullanıcılar' },
            { id: 'weeks', label: 'Haftalar' },
            { id: 'analytics', label: 'Analitik' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.75rem 1.25rem',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === tab.id ? '3px solid #3b82f6' : '3px solid transparent',
                color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
                fontWeight: activeTab === tab.id ? '600' : '400',
                cursor: 'pointer',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
              <div className="admin-card-header">
                <h3 className="admin-card-title">Son 4 Hafta Ortalama Getiriler</h3>
                <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={loadData}>
                  Yenile
                </button>
              </div>
              {avgReturnsByWeek.length > 0 ? (
                <>
                  <div ref={weeklyReturnsChartRef} style={{ marginBottom: '1rem' }}></div>
                  <div className="admin-table-wrapper">
                    <table className="admin-table admin-table-compact">
                      <thead>
                        <tr>
                          <th>Hafta</th>
                          <th style={{ textAlign: 'right' }}>Ortalama Getiri</th>
                          <th style={{ textAlign: 'right' }}>Kullanıcı Sayısı</th>
                        </tr>
                      </thead>
                      <tbody>
                        {avgReturnsByWeek.map((item) => (
                          <tr key={item.weekId}>
                            <td style={{ fontWeight: '600' }}>{item.weekId}</td>
                            <td style={{ 
                              textAlign: 'right', 
                              fontWeight: '600',
                              color: Number(item.avgReturn) >= 0 ? '#10b981' : '#ef4444'
                            }}>
                              {formatPct(item.avgReturn)}
                            </td>
                            <td style={{ textAlign: 'right' }}>{item.userCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Veri bulunamadı</div>
              )}
            </div>

            <div className="admin-card">
              <div className="admin-card-header">
                <h3 className="admin-card-title">En İyi %10 Kullanıcı (Bakiye Bazlı)</h3>
              </div>
              <div className="admin-table-wrapper">
                <table className="admin-table admin-table-compact">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Kullanıcı</th>
                      <th>Email</th>
                      <th style={{ textAlign: 'right' }}>Bakiye</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top10Percent.map((user, idx) => (
                      <tr key={user.uid}>
                        <td style={{ fontWeight: '600' }}>{idx + 1}</td>
                        <td style={{ fontWeight: '500' }}>{user.username}</td>
                        <td style={{ fontSize: '0.8125rem' }}>{user.email}</td>
                        <td style={{ textAlign: 'right', fontWeight: '600' }}>
                          {formatMoney(user.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'pairs' && (
          <>
            <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
              <div className="admin-card-header">
                <h3 className="admin-card-title">En Çok Tercih Edilen Pariteler (Top 10)</h3>
              </div>
              {mostPopularPairs.length > 0 ? (
                <>
                  <div ref={popularPairsChartRef} style={{ marginBottom: '1rem' }}></div>
                  <div className="admin-table-wrapper">
                    <table className="admin-table admin-table-compact">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Parite</th>
                          <th style={{ textAlign: 'right' }}>Toplam Ağırlık</th>
                          <th style={{ textAlign: 'right' }}>Allocation Sayısı</th>
                          <th style={{ textAlign: 'right' }}>Ortalama Ağırlık</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mostPopularPairs.map((item, idx) => {
                          const instrument = getInstrumentByCode(item.pair);
                          const fullName = instrument?.fullName || instrument?.name || item.pair;
                          return (
                            <tr key={item.pair}>
                              <td style={{ fontWeight: '600' }}>{idx + 1}</td>
                              <td>
                                <div>
                                  <div style={{ fontWeight: '600' }}>{item.pair}</div>
                                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }} title={fullName}>
                                    {fullName.length > 40 ? fullName.substring(0, 40) + '...' : fullName}
                                  </div>
                                </div>
                              </td>
                              <td style={{ textAlign: 'right' }}>{(item.totalWeight * 100).toFixed(2)}%</td>
                              <td style={{ textAlign: 'right' }}>{item.allocationCount}</td>
                              <td style={{ textAlign: 'right' }}>{(item.avgWeight * 100).toFixed(2)}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Veri bulunamadı</div>
              )}
            </div>

            <div className="admin-card">
              <div className="admin-card-header">
                <h3 className="admin-card-title">Parite Bazlı Kullanıcı Tercihleri</h3>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <select
                  className="admin-form-select"
                  value={selectedPair || ''}
                  onChange={(e) => setSelectedPair(e.target.value || null)}
                  style={{ minWidth: '250px' }}
                >
                  <option value="">Parite seçin...</option>
                  {mostPopularPairs.slice(0, 30).map(item => {
                    const instrument = getInstrumentByCode(item.pair);
                    const fullName = instrument?.fullName || instrument?.name || item.pair;
                    return (
                      <option key={item.pair} value={item.pair}>
                        {item.pair} - {fullName.length > 50 ? fullName.substring(0, 50) + '...' : fullName}
                      </option>
                    );
                  })}
                </select>
              </div>
              {selectedPair && pairPreferenceLists[selectedPair] && (
                <div className="admin-table-wrapper">
                  <table className="admin-table admin-table-compact">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Kullanıcı</th>
                        <th>Email</th>
                        <th style={{ textAlign: 'right' }}>Kullanım Sayısı</th>
                        <th style={{ textAlign: 'right' }}>Toplam Ağırlık</th>
                        <th style={{ textAlign: 'right' }}>Ortalama Ağırlık</th>
                        <th style={{ textAlign: 'right' }}>Max Ağırlık</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pairPreferenceLists[selectedPair].map((user, idx) => (
                        <tr key={user.uid}>
                          <td style={{ fontWeight: '600' }}>{idx + 1}</td>
                          <td style={{ fontWeight: '500' }}>{user.username}</td>
                          <td style={{ fontSize: '0.8125rem' }}>{user.email}</td>
                          <td style={{ textAlign: 'right' }}>{user.count}</td>
                          <td style={{ textAlign: 'right' }}>{(user.totalWeight * 100).toFixed(2)}%</td>
                          <td style={{ textAlign: 'right' }}>{(user.avgWeight * 100).toFixed(2)}%</td>
                          <td style={{ textAlign: 'right' }}>{(user.maxWeight * 100).toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'users' && (
          <>
            <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
              <div className="admin-card-header">
                <h3 className="admin-card-title">Top Kullanıcılar (Bakiye)</h3>
              </div>
              {top10Percent.length > 0 && (
                <div ref={userBalanceChartRef}></div>
              )}
            </div>

            <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
              <div className="admin-card-header">
                <h3 className="admin-card-title">Kullanıcılar (Allocation Sayısı Bazlı)</h3>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Ara..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="admin-form-input"
                    style={{ width: '200px', padding: '0.375rem 0.5rem', fontSize: '0.875rem' }}
                  />
                  <select
                    className="admin-form-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{ minWidth: '120px' }}
                  >
                    <option value="allocations">Allocation</option>
                    <option value="balance">Bakiye</option>
                  </select>
                  <button
                    className="admin-btn admin-btn-secondary admin-btn-sm"
                    onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                  >
                    {sortOrder === 'desc' ? '↓' : '↑'}
                  </button>
                </div>
              </div>
              <div className="admin-table-wrapper admin-scrollable" style={{ maxHeight: '400px' }}>
                <table className="admin-table admin-table-compact">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Kullanıcı</th>
                      <th>Email</th>
                      <th style={{ textAlign: 'right' }}>Allocation</th>
                      <th style={{ textAlign: 'right' }}>Bakiye</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.slice(0, 100).map((user, idx) => (
                      <tr key={user.uid}>
                        <td style={{ fontWeight: '600' }}>{idx + 1}</td>
                        <td style={{ fontWeight: '500' }}>{user.username}</td>
                        <td style={{ fontSize: '0.8125rem' }}>{user.email}</td>
                        <td style={{ textAlign: 'right' }}>{user.allocationCount}</td>
                        <td style={{ textAlign: 'right' }}>{formatMoney(user.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="admin-card">
              <div className="admin-card-header">
                <h3 className="admin-card-title">Kullanıcılar (Win Rate Bazlı - Min 3 Hafta)</h3>
              </div>
              <div className="admin-table-wrapper admin-scrollable" style={{ maxHeight: '400px' }}>
                <table className="admin-table admin-table-compact">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Kullanıcı</th>
                      <th>Email</th>
                      <th style={{ textAlign: 'right' }}>Win Rate</th>
                      <th style={{ textAlign: 'right' }}>Kazanç</th>
                      <th style={{ textAlign: 'right' }}>Toplam</th>
                      <th style={{ textAlign: 'right' }}>Bakiye</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersByWinRate.slice(0, 100).map((user, idx) => (
                      <tr key={user.uid}>
                        <td style={{ fontWeight: '600' }}>{idx + 1}</td>
                        <td style={{ fontWeight: '500' }}>{user.username}</td>
                        <td style={{ fontSize: '0.8125rem' }}>{user.email}</td>
                        <td style={{ 
                          textAlign: 'right', 
                          fontWeight: '600',
                          color: user.winRate >= 50 ? '#10b981' : '#ef4444'
                        }}>
                          {user.winRate.toFixed(1)}%
                        </td>
                        <td style={{ textAlign: 'right' }}>{user.wins}</td>
                        <td style={{ textAlign: 'right' }}>{user.total}</td>
                        <td style={{ textAlign: 'right' }}>{formatMoney(user.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'weeks' && (
          <div className="admin-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">Hafta Bazlı Parite Tercihleri</h3>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <select
                className="admin-form-select"
                value={selectedWeek || ''}
                onChange={(e) => setSelectedWeek(e.target.value || null)}
                style={{ minWidth: '200px' }}
              >
                <option value="">Hafta seçin...</option>
                {weekOptions.map(weekId => (
                  <option key={weekId} value={weekId}>{weekId}</option>
                ))}
              </select>
            </div>
            {selectedWeek && pairsByWeek[selectedWeek] && (
              <div className="admin-table-wrapper">
                <table className="admin-table admin-table-compact">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Parite</th>
                      <th style={{ textAlign: 'right' }}>Toplam Ağırlık</th>
                      <th style={{ textAlign: 'right' }}>Kullanıcı Sayısı</th>
                      <th style={{ textAlign: 'right' }}>Ortalama Ağırlık</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(pairsByWeek[selectedWeek])
                      .map(([pair, stats]) => ({
                        pair,
                        ...stats,
                        avgWeight: stats.count > 0 ? stats.totalWeight / stats.count : 0
                      }))
                      .sort((a, b) => b.totalWeight - a.totalWeight)
                      .slice(0, 20)
                      .map((item, idx) => {
                        const instrument = getInstrumentByCode(item.pair);
                        const fullName = instrument?.fullName || instrument?.name || item.pair;
                        return (
                          <tr key={item.pair}>
                            <td style={{ fontWeight: '600' }}>{idx + 1}</td>
                            <td>
                              <div>
                                <div style={{ fontWeight: '600' }}>{item.pair}</div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }} title={fullName}>
                                  {fullName.length > 40 ? fullName.substring(0, 40) + '...' : fullName}
                                </div>
                              </div>
                            </td>
                            <td style={{ textAlign: 'right' }}>{(item.totalWeight * 100).toFixed(2)}%</td>
                            <td style={{ textAlign: 'right' }}>{item.count}</td>
                            <td style={{ textAlign: 'right' }}>{(item.avgWeight * 100).toFixed(2)}%</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <>
            {/* User Segments */}
            <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
              <div className="admin-card-header">
                <h3 className="admin-card-title">Kullanıcı Segmentasyonu (Bakiye Bazlı)</h3>
              </div>
              <div className="admin-table-wrapper">
                <table className="admin-table admin-table-compact">
                  <thead>
                    <tr>
                      <th>Segment</th>
                      <th style={{ textAlign: 'right' }}>Kullanıcı Sayısı</th>
                      <th style={{ textAlign: 'right' }}>Toplam Bakiye</th>
                      <th style={{ textAlign: 'right' }}>Ortalama Bakiye</th>
                      <th style={{ textAlign: 'right' }}>Oran</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: '600', color: '#10b981' }}>Yüksek (≥₺150k)</td>
                      <td style={{ textAlign: 'right' }}>{userSegments.high.count}</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(userSegments.high.total)}</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(userSegments.high.avg)}</td>
                      <td style={{ textAlign: 'right' }}>{kpis.totalUsers > 0 ? ((userSegments.high.count / kpis.totalUsers) * 100).toFixed(1) : 0}%</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: '600', color: '#f59e0b' }}>Orta (₺100k-₺150k)</td>
                      <td style={{ textAlign: 'right' }}>{userSegments.medium.count}</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(userSegments.medium.total)}</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(userSegments.medium.avg)}</td>
                      <td style={{ textAlign: 'right' }}>{kpis.totalUsers > 0 ? ((userSegments.medium.count / kpis.totalUsers) * 100).toFixed(1) : 0}%</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: '600', color: '#6b7280' }}>Düşük (&lt;₺100k)</td>
                      <td style={{ textAlign: 'right' }}>{userSegments.low.count}</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(userSegments.low.total)}</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(userSegments.low.avg)}</td>
                      <td style={{ textAlign: 'right' }}>{kpis.totalUsers > 0 ? ((userSegments.low.count / kpis.totalUsers) * 100).toFixed(1) : 0}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pair Concentration */}
            <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
              <div className="admin-card-header">
                <h3 className="admin-card-title">Parite Konsantrasyon Analizi</h3>
              </div>
              <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="admin-stat-card">
                  <div className="admin-stat-label">Farklı Parite</div>
                  <div className="admin-stat-value">{pairConcentration.uniquePairs}</div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-label">Toplam Kullanım</div>
                  <div className="admin-stat-value">{pairConcentration.totalUsage}</div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-label">Top 3 Payı</div>
                  <div className="admin-stat-value">{pairConcentration.top3Share.toFixed(1)}%</div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-label">Herfindahl Index</div>
                  <div className="admin-stat-value">{pairConcentration.herfindahlIndex.toFixed(1)}</div>
                </div>
              </div>
            </div>

            {/* High Risk Users */}
            <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
              <div className="admin-card-header">
                <h3 className="admin-card-title">Yüksek Konsantrasyon Riski (Tek Pariteye &gt;50% Ağırlık)</h3>
              </div>
              <div className="admin-table-wrapper admin-scrollable" style={{ maxHeight: '400px' }}>
                <table className="admin-table admin-table-compact">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Kullanıcı</th>
                      <th>Email</th>
                      <th style={{ textAlign: 'right' }}>Max Tek Ağırlık</th>
                      <th style={{ textAlign: 'right' }}>Risk Seviyesi</th>
                      <th style={{ textAlign: 'right' }}>Bakiye</th>
                    </tr>
                  </thead>
                  <tbody>
                    {highRiskUsers.slice(0, 30).map((user, idx) => (
                      <tr key={user.uid}>
                        <td style={{ fontWeight: '600' }}>{idx + 1}</td>
                        <td style={{ fontWeight: '500' }}>{user.username}</td>
                        <td style={{ fontSize: '0.8125rem' }}>{user.email}</td>
                        <td style={{ textAlign: 'right', fontWeight: '600' }}>
                          {(user.maxSingleWeight * 100).toFixed(1)}%
                        </td>
                        <td style={{ 
                          textAlign: 'right',
                          fontWeight: '600',
                          color: user.riskLevel === 'Yüksek' ? '#ef4444' : user.riskLevel === 'Orta' ? '#f59e0b' : '#6b7280'
                        }}>
                          {user.riskLevel}
                        </td>
                        <td style={{ textAlign: 'right' }}>{formatMoney(user.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Weekly Trends */}
            {weeklyTrends && weeklyTrends.length > 0 && (
              <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
                <div className="admin-card-header">
                  <h3 className="admin-card-title">Haftalık Trend Analizi</h3>
                </div>
                <div className="admin-table-wrapper">
                  <table className="admin-table admin-table-compact">
                    <thead>
                      <tr>
                        <th>Hafta</th>
                        <th style={{ textAlign: 'right' }}>Parite Sayısı</th>
                        <th style={{ textAlign: 'right' }}>Toplam Ağırlık</th>
                        <th style={{ textAlign: 'right' }}>Ortalama Getiri</th>
                        <th style={{ textAlign: 'right' }}>Kullanıcı</th>
                        <th style={{ textAlign: 'right' }}>Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyTrends.map((trend, idx) => (
                        <tr key={trend.weekId}>
                          <td style={{ fontWeight: '600' }}>{trend.weekId}</td>
                          <td style={{ textAlign: 'right' }}>{trend.pairCount}</td>
                          <td style={{ textAlign: 'right' }}>{(trend.totalWeight * 100).toFixed(2)}%</td>
                          <td style={{ 
                            textAlign: 'right',
                            fontWeight: '600',
                            color: trend.avgReturn >= 0 ? '#10b981' : '#ef4444'
                          }}>
                            {formatPct(trend.avgReturn)}
                          </td>
                          <td style={{ textAlign: 'right' }}>{trend.userCount}</td>
                          <td style={{ 
                            textAlign: 'right',
                            fontWeight: '600',
                            color: trend.trend >= 0 ? '#10b981' : '#ef4444'
                          }}>
                            {idx > 0 ? (trend.trend >= 0 ? '↑' : '↓') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Top Pairs by Week */}
            <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
              <div className="admin-card-header">
                <h3 className="admin-card-title">Her Hafta En Çok Tercih Edilen Pariteler</h3>
              </div>
              <div className="admin-table-wrapper">
                <table className="admin-table admin-table-compact">
                  <thead>
                    <tr>
                      <th>Hafta</th>
                      <th>1. Parite</th>
                      <th style={{ textAlign: 'right' }}>Toplam Ağırlık</th>
                      <th>2. Parite</th>
                      <th style={{ textAlign: 'right' }}>Toplam Ağırlık</th>
                      <th>3. Parite</th>
                      <th style={{ textAlign: 'right' }}>Toplam Ağırlık</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(topPairsByWeek).map(([weekId, pairs]) => (
                      <tr key={weekId}>
                        <td style={{ fontWeight: '600' }}>{weekId}</td>
                        {[0, 1, 2].map(idx => {
                          const pair = pairs[idx];
                          if (!pair) return <td key={idx} colSpan={idx === 0 ? 2 : 2}></td>;
                          const instrument = getInstrumentByCode(pair.pair);
                          const fullName = instrument?.fullName || instrument?.name || pair.pair;
                          return (
                            <React.Fragment key={idx}>
                              <td>
                                <div>
                                  <div style={{ fontWeight: '600' }}>{pair.pair}</div>
                                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }} title={fullName}>
                                    {fullName.length > 25 ? fullName.substring(0, 25) + '...' : fullName}
                                  </div>
                                </div>
                              </td>
                              <td style={{ textAlign: 'right' }}>{(pair.totalWeight * 100).toFixed(2)}%</td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Users by Total Weight */}
            <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
              <div className="admin-card-header">
                <h3 className="admin-card-title">En Çok Ağırlık Veren Kullanıcılar</h3>
              </div>
              <div className="admin-table-wrapper admin-scrollable" style={{ maxHeight: '400px' }}>
                <table className="admin-table admin-table-compact">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Kullanıcı</th>
                      <th>Email</th>
                      <th style={{ textAlign: 'right' }}>Toplam Ağırlık</th>
                      <th style={{ textAlign: 'right' }}>Parite Sayısı</th>
                      <th style={{ textAlign: 'right' }}>Max Tek Ağırlık</th>
                      <th style={{ textAlign: 'right' }}>Bakiye</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersByTotalWeight.slice(0, 50).map((user, idx) => (
                      <tr key={user.uid}>
                        <td style={{ fontWeight: '600' }}>{idx + 1}</td>
                        <td style={{ fontWeight: '500' }}>{user.username}</td>
                        <td style={{ fontSize: '0.8125rem' }}>{user.email}</td>
                        <td style={{ textAlign: 'right' }}>{(user.totalWeight * 100).toFixed(2)}%</td>
                        <td style={{ textAlign: 'right' }}>{user.pairCount}</td>
                        <td style={{ textAlign: 'right' }}>{(user.maxSingleWeight * 100).toFixed(2)}%</td>
                        <td style={{ textAlign: 'right' }}>{formatMoney(user.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Gainers and Losers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="admin-card">
                <div className="admin-card-header">
                  <h3 className="admin-card-title">En Çok Kazananlar</h3>
                </div>
                <div className="admin-table-wrapper admin-scrollable" style={{ maxHeight: '400px' }}>
                  <table className="admin-table admin-table-compact">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Kullanıcı</th>
                        <th style={{ textAlign: 'right' }}>Toplam Getiri</th>
                        <th style={{ textAlign: 'right' }}>Ortalama</th>
                        <th style={{ textAlign: 'right' }}>Hafta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topGainersLosers.topGainers.map((user, idx) => (
                        <tr key={user.uid}>
                          <td style={{ fontWeight: '600' }}>{idx + 1}</td>
                          <td style={{ fontWeight: '500' }}>{user.username}</td>
                          <td style={{ textAlign: 'right', fontWeight: '600', color: '#10b981' }}>
                            {formatPct(user.totalReturn)}
                          </td>
                          <td style={{ textAlign: 'right' }}>{formatPct(user.avgReturn)}</td>
                          <td style={{ textAlign: 'right' }}>{user.weeks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="admin-card">
                <div className="admin-card-header">
                  <h3 className="admin-card-title">En Çok Kaybedenler</h3>
                </div>
                <div className="admin-table-wrapper admin-scrollable" style={{ maxHeight: '400px' }}>
                  <table className="admin-table admin-table-compact">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Kullanıcı</th>
                        <th style={{ textAlign: 'right' }}>Toplam Getiri</th>
                        <th style={{ textAlign: 'right' }}>Ortalama</th>
                        <th style={{ textAlign: 'right' }}>Hafta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topGainersLosers.topLosers.map((user, idx) => (
                        <tr key={user.uid}>
                          <td style={{ fontWeight: '600' }}>{idx + 1}</td>
                          <td style={{ fontWeight: '500' }}>{user.username}</td>
                          <td style={{ textAlign: 'right', fontWeight: '600', color: '#ef4444' }}>
                            {formatPct(user.totalReturn)}
                          </td>
                          <td style={{ textAlign: 'right' }}>{formatPct(user.avgReturn)}</td>
                          <td style={{ textAlign: 'right' }}>{user.weeks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Most Active Users */}
            <div className="admin-card">
              <div className="admin-card-header">
                <h3 className="admin-card-title">En Aktif Kullanıcılar (Hafta Katılımı)</h3>
              </div>
              <div className="admin-table-wrapper admin-scrollable" style={{ maxHeight: '400px' }}>
                <table className="admin-table admin-table-compact">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Kullanıcı</th>
                      <th>Email</th>
                      <th style={{ textAlign: 'right' }}>Katıldığı Hafta</th>
                      <th style={{ textAlign: 'right' }}>Toplam Allocation</th>
                      <th style={{ textAlign: 'right' }}>Katılım Oranı</th>
                      <th style={{ textAlign: 'right' }}>Bakiye</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mostActiveUsers.slice(0, 50).map((user, idx) => (
                      <tr key={user.uid}>
                        <td style={{ fontWeight: '600' }}>{idx + 1}</td>
                        <td style={{ fontWeight: '500' }}>{user.username}</td>
                        <td style={{ fontSize: '0.8125rem' }}>{user.email}</td>
                        <td style={{ textAlign: 'right' }}>{user.weekCount}</td>
                        <td style={{ textAlign: 'right' }}>{user.allocationCount}</td>
                        <td style={{ textAlign: 'right' }}>{user.participationRate.toFixed(1)}%</td>
                        <td style={{ textAlign: 'right' }}>{formatMoney(user.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPerformance;
