import type { TranslationStrings } from '../types';

const members: TranslationStrings = {
  'members.shareTrip': 'Share Event',
  'members.inviteUser': 'Invite User',
  'members.selectUser': 'Select user…',
  'members.invite': 'Invite',
  'members.allHaveAccess': 'All users already have access.',
  'members.access': 'Access',
  'members.person': 'person',
  'members.persons': 'persons',
  'members.you': 'you',
  'members.owner': 'Owner',
  'members.leaveTrip': 'Leave event',
  'members.removeAccess': 'Remove access',
  'members.confirmLeave': 'Leave event? You will lose access.',
  'members.confirmRemove': 'Remove access for this user?',
  'members.loadError': 'Failed to load crew',
  'members.added': 'added',
  'members.addError': 'Failed to add',
  'members.removed': 'Crew member removed',
  'members.removeError': 'Failed to remove',
  'members.makeOwner': 'Make owner',
  'members.confirmTransfer': 'Transfer ownership to {name}? You will become a regular crew member.',
  'members.transferError': 'Failed to transfer ownership',
  'members.guests': 'Guests',
  'members.guest': 'Guest',
  'members.guestsHint':
    'People without an account. They can be assigned to costs, packing and tasks, but cannot sign in.',
  'members.addGuest': 'Add guest',
  'members.guestNamePlaceholder': 'Guest name',
  'members.guestAdded': 'Guest added',
  'members.guestAddError': 'Failed to add guest',
  'members.guestRenameError': 'Failed to rename guest',
  'members.guestRemoved': 'Guest removed',
  'members.confirmRemoveGuest': 'Remove this guest? Their assignments and cost shares will be removed too.',

  // Crew admin redesign: sectioned manager with info popups, proper confirm
  // dialogs, added-by metadata and guest → full-account promotion.
  'members.crewSection': 'Event crew',
  'members.crewInfoTitle': 'Crew on this event',
  'members.crewInfoBody':
    'Crew members have full accounts and can see the event. The owner controls the event itself; everything else follows the instance permission settings. Add crew from the directory below, or hand them the join link — it puts them straight onto the crew.',
  'members.guestInfoTitle': 'Temp guests',
  'members.guestInfoBody':
    'A guest is a person without an account: they can sit on bills, tabs, packing and tasks, but can never sign in. When they get a real account, promote the guest onto it — every split, payment and tab moves across and the guest disappears.',
  'members.addedMeta': 'Added {date}',
  'members.addedMetaBy': 'Added {date} · invited by {name}',
  'members.removeMemberTitle': 'Remove crew member',
  'members.removeMemberBody':
    '{name} will lose access to this event. Their past expenses and shares stay in the ledger.',
  'members.leaveTitle': 'Leave event',
  'members.leaveBody': 'You will lose access to this event until someone adds you again.',
  'members.leaveConfirm': 'Leave',
  'members.removeConfirm': 'Remove',
  'members.deleteGuestTitle': 'Delete guest',
  'members.deleteGuestBody':
    'This permanently deletes {name}. Their split shares and assignments are removed from every bill, and any tab link for them stops working. If they have joined the platform, promote them instead so nothing is lost.',
  'members.deleteGuestConfirm': 'Delete guest',
  'members.promote': 'Promote',
  'members.promoteTitle': 'Promote guest to full account',
  'members.promoteBody':
    'Pick the account {name} now owns. Every split share, payment, settlement and tab of the guest moves onto that account (it joins the crew if needed), then the guest entry disappears. This cannot be undone.',
  'members.promoteSelect': 'Their account',
  'members.promoteSearch': 'Search accounts…',
  'members.promoteConfirm': 'Merge into account',
  'members.promoteDone': 'Guest promoted — history moved to the account',
  'members.promoteError': 'Failed to promote guest',
  'members.transferTitle': 'Transfer ownership',
  'members.transferConfirm': 'Make owner',
};
export default members;
