export const colors = {
  primary: '#1463FF',
  background: '#F6F8FC',
  surface: '#FFFFFF',
  textPrimary: '#101828',
  textSecondary: '#667085',
  border: '#E4E7EC',
  success: '#128A3D',
  danger: '#E11D2E',
  disabled: '#BFD6FF',
} as const;

export type AppColor = keyof typeof colors;
