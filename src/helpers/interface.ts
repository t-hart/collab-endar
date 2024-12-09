import { v4 as uuid } from 'uuid';
import { eachDayOfInterval } from 'date-fns';

export enum AddType {
  BEFORE = 'BEFORE',
  AFTER = 'AFTER',
}

export interface AddProps {
  addType: AddType;
  id: number | Date;
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

export async function getPlan(planId: string): Promise<Plan> {
  // Get plan from cosmos db
  const response = await fetch(`/api/getPlan/${planId}`);
  if (!response.ok) {
    throw new Error(`Error fetching plan: ${response.statusText}`);
  }
  const data: any = await response.json();
  const { plan, dates, activities } = data.data;

  const planDates: PlanDate[] = dates
    .map((date: any) => ({
      // Parse date from date_id string
      id: new Date(date.id.split('|')[1]),
      createdBy: date.createdBy,

      // Loop through activities and assign to this date if date_id in activity_id
      activities: activities
        .filter((activity: any) => activity.id.startsWith(`${date.id}`))
        .map((activity: any) => ({
          // Parse activity id from activity_id string
          id: parseInt(activity.id.split('|')[3]),
          createdBy: activity.createdBy,
          activityText: activity.activityText,
        })),
    }))
    .sort((a: PlanDate, b: PlanDate) => a.id.getTime() - b.id.getTime());

  const requestedPlan: Plan = {
    planMetadata: {
      planId: planId,
      planName: plan.planName,
      createdBy: plan.createdBy,
    },
    dates: planDates,
  };

  console.log('Requested plan: ', requestedPlan);
  return requestedPlan;
}

export function createBasePlan(
  planName: string,
  createdBy: string,
  startDate: string,
  endDate: string
): Plan {
  const dateArr = eachDayOfInterval({
    start: new Date(startDate),
    end: new Date(endDate),
  });
  const planDates = dateArr.map<PlanDate>((date) =>
    createPlanDate(date, createdBy)
  );

  const plan: Plan = {
    planMetadata: {
      // planId: uuid(),
      planId: 'f7873135-5f9d-4394-b823-a599a94a81f6-9999999',
      planName: planName,
      createdBy: createdBy,
    },
    dates: planDates,
  };
  return plan;
}

export function createPlanDate(date: Date, createdBy: string): PlanDate {
  return {
    id: date,
    createdBy: createdBy,
    activities: [
      {
        id: 0,
        createdBy: createdBy,
      },
    ],
  };
}

export function getDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface ErrorResponse {
  error: string;
}

export interface ActivityMsg {
  id: number;
  dateId: string;
  byUser: string;
  activityText?: string;
  isFinal?: boolean;
}

export interface DateMsg {
  id: string;
  byUser: string;
}

export function stringifyPlanDate(date: PlanDate): string {
  const formattedDate = {
    id: getDateString(date.id),
    createdBy: date.createdBy,
  };
  return JSON.stringify(formattedDate);
}
