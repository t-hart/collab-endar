
export enum AddType {
  BEFORE = "BEFORE",
  AFTER = "AFTER",
}

export interface AddProps {
  addType: AddType
  id: any
}