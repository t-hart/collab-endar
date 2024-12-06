import { v4 as uuid } from 'uuid';
import { eachDayOfInterval } from 'date-fns';

export enum AddType {
  BEFORE = "BEFORE",
  AFTER = "AFTER",
}

export interface AddProps {
  addType: AddType
  id: number | Date
}

export interface Plan {
  planMetadata: PlanMetadata;
  dates: PlanDate[];
}

export interface PlanMetadata {
  planId: string;
  planName: string;
  createdBy: string;
}

export interface PlanDate {
  id: Date;
  createdBy: string;
  activities: PlanActivity[];
}

export interface PlanActivity {
  id: number;
  createdBy: string;
  activityText?: string;
}

export function createBasePlan(planName: string, createdBy: string, startDate: string, endDate: string): Plan {

  const dateArr = eachDayOfInterval({ start: new Date(startDate), end: new Date(endDate) })
  const planDates = dateArr.map<PlanDate>(date => (
    createPlanDate(date, createdBy)
  ))

  const plan: Plan = {
    planMetadata: {
      planId: uuid(),
      planName: planName,
      createdBy: createdBy,
    },
    dates: planDates,
  }
  return plan
}

export function createPlanDate(date: Date, createdBy: string): PlanDate {
  return {
    id: date,
    createdBy: createdBy,
    activities: [
      {
        id: 0,
        createdBy: createdBy,
      }
    ]

  }
}
