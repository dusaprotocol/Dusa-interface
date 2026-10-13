import React from 'react';
import { DateTimePicker as SharedDateTimePicker } from 'components/DateTimePicker';

interface Props {
  date: Date;
  setDate: (date: Date) => void;
  yearRange?: number;
}

export const DateTimePicker: React.FC<Props> = ({
  date,
  setDate,
  yearRange = 2
}) => {
  return (
    <SharedDateTimePicker date={date} setDate={setDate} yearRange={yearRange} />
  );
};
