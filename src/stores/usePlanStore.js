import { create } from 'zustand';
import { DataService } from '../services/dataService';
import { todayISO } from '../utils/dateUtils';

export const usePlanStore = create((set, get) => ({
  dailyPlans: [],

  setDailyPlans: (dailyPlans) => set({ dailyPlans }),

  getTodayPlan: () => {
    const today = todayISO();
    return get().dailyPlans.find(p => p.date === today) || null;
  },

  getPlanForDate: (dateStr) => {
    return get().dailyPlans.find(p => p.date === dateStr) || null;
  },

  saveDailyPlan: async (plan) => {
    return await DataService.saveDailyPlan(plan);
  },

  deleteDailyPlan: async (id) => {
    return await DataService.deleteDailyPlan(id);
  },

  toggleTask: async (dateStr, taskId) => {
    const plan = get().getPlanForDate(dateStr);
    if (!plan || !plan.items) return;
    const updated = {
      ...plan,
      items: plan.items.map(i => i.id === taskId ? { ...i, completed: !i.completed } : i)
    };
    return await DataService.saveDailyPlan(updated);
  }
}));
