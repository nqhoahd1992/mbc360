import { Alert } from 'antd';

// Soft guidance: the module stays fully usable, but when the project has not yet
// reached the phase/gate this activity belongs to, we show a non-blocking reminder.
export default function PhaseDependencyAlert({
  reached,
  title,
  description,
}: {
  reached: boolean;
  title: string;
  description: string;
}) {
  if (reached) return null;
  return <Alert type="warning" showIcon title={title} description={description} />;
}
