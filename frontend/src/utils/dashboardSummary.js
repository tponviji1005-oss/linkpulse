export function getPriorityColor(priority) {
  if (priority === 'HIGH') return 'red';
  if (priority === 'MEDIUM') return 'orange';
  return 'green';
}
