export type Feedback = {
  open: boolean;
  title: string;
  description: string;
  actionLabel: string;
  variant: "success" | "error";
};

export type Room = {
  id: number;
  roomTitle: string;
  description: string;
  location: string;
  createdAt: string;
  createdBy: string;
  backgroundId?: string;
};

export type RoomUser = {
  userId: string;
  name: string;
};