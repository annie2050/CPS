const ROLE_HIERARCHY = {
  HOD: 80,
  MANAGER: 60,
  EMPLOYEE: 40,
  TEMP: 20,
  PART_TIME: 10,
};

function getLevel(role) {
  return ROLE_HIERARCHY[role] || 0;
}

function canManage(actorRole, targetRole) {
  return getLevel(actorRole) > getLevel(targetRole);
}

function canManageAny(actorRole) {
  return getLevel(actorRole) > getLevel('PART_TIME');
}

module.exports = { ROLE_HIERARCHY, getLevel, canManage, canManageAny };
