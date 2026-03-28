⚠️ Important Fix (Backend Needed)

👉 Team UI needs teamSize from event

Currently team doesn’t have it ❌

✅ Quick Fix (Frontend)

Replace:

const max = currentTeam.teamSize || 4;

👉 With:

const max = 4; // temporary

👉 Later we’ll fetch event details properly



so need to change the qr code page or the ticket thing so that it also scans for date such that the qr can be scanned on the event day only

in the preview page of admin ->the preview of event page the register buttons should not show 

the payment gateway needs to be integrated

more event data for a particcular event need to be stored
model expansion needed

the ticket mail needs to be send seperately to each members and qr code should be unique

for now if there is 2 members in a team the leader gets to see two fields which should not show 
only th team details should show for each event 

session thing can be implemented at last

other features can be integrated