import { Badges } from '../data/Badges';

export const getRoleDisplayLabel = ({ role, gender, isGuest, badge } = {}) => {
  const r = (role || '').toLowerCase();
  const g = (gender || '').toLowerCase();

  if (isGuest || r === 'guest') {
    if (g === 'female') return 'Stree';
    if (g === 'transgender' || g === 'other') return 'Ardhnaari';
    return 'Purush';
  }

  if (badge && Badges[badge]?.name) {
    return Badges[badge].name;
  }

  if (r === 'owner' || r === 'superowner') return 'Godfather';
  if (r === 'admin') return 'High Council';
  if (r === 'moderator') return 'Guardian';

  return 'Member';
};
