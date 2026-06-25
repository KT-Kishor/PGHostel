# Admin "Book for Yourself" — Customer-Type Booking Feature

A complete implementation guide for the **Book for Yourself** tile (Vendor/Supplier
category) and its extension to support booking on behalf of **New** and **Existing**
customers, in addition to the original **Self** booking.

This document explains the *why, what, how, where, and when* of every part so a new
developer can understand and maintain it.

---

## 1. Big Picture (What & Why)

**What:** Inside the TilePage, an admin/staff user clicks the "Book for Yourself"
tile. A dialog opens where they pick a Branch, a Room, a Plan, and see the Rent.
We extended this dialog with a **"Booking For"** radio group offering three modes:

| Mode | Who is the booking for? | Source of customer data |
|------|------------------------|--------------------------|
| **Self Booking** | The logged-in admin/user | `LoginModel` (unchanged baseline) |
| **New Customer** | A person new to *this branch* | Email-first upsert: global `HM_Login` check → reuse if found, else register in `HM_Login` |
| **Existing Customer** | Any user returned by the backend customer directory | Loaded once from unfiltered `HM_LoginUser`, then filtered locally by email |

**Why:** Front-desk staff frequently make bookings *on behalf of* a walk-in or
phone customer. Previously the tile could only book for the logged-in user. The
extension lets staff either register a new customer on the spot or pick an
existing one from the full login-user directory, then run the normal booking flow
as if that customer were booking themselves.

**Core principle:** For New/Existing modes, the booking must carry **only the
customer's identity** — the admin's identity is intentionally dropped. This is the
single most important rule and drives several non-obvious code decisions below.

---

## 2. Files Touched (Where)

| File | Role in this feature |
|------|----------------------|
| `webapp/fragment/AdminBooking.fragment.xml` | The dialog UI: radio group + New/Existing sub-forms |
| `webapp/controller/TilePage.controller.js` | All dialog logic: validation, lookup, register, Book Now dispatch |
| `webapp/controller/Booking.controller.js` | A single guard so the booking page keeps the customer's identity |
| `webapp/i18n/i18n.properties` | All new labels and messages |

---

## 3. Base Context You Must Know First

Before reading the implementation, understand these existing pieces the feature
relies on. (These already existed — the feature reuses them.)

### 3.1 How the dialog is loaded
`TileV_onpressBookForYourself` loads the fragment with the **view's ID** as the
fragment ID:

```js
sap.ui.core.Fragment.load({
    id: this.getView().getId(),      // <-- fragment controls become view-scoped
    name: "sap.ui.com.project1.fragment.AdminBooking",
    controller: this
})
```

**Consequence (important):** every control with an `id` in the fragment is
*namespaced under the view*. So in the controller we access them with
`this.byId("AB_id_NC_Email")`, **not** `sap.ui.getCore().byId(...)`. This is the key
difference from the login dialog (`SignInSignup.fragment.xml`), which is loaded
*without* a view ID and therefore uses global core IDs.

### 3.2 The booking hand-off model: `HostelModel`
The booking page (`Booking.controller.js`) reads everything it needs from a
**core-level** model named `HostelModel`:

```js
sap.ui.getCore().getModel("HostelModel")
```

The "Book for Yourself" dialog *seeds* this model (branch, room, plan, prices, and
customer identity) and then navigates to `RouteBooking`. The booking page picks it
up on its route-matched handler.

### 3.3 `ReturnRoute` — how we come back to the tile page
When seeding `HostelModel`, we set `ReturnRoute: "TilePage"`. After the booking is
submitted, `Booking.controller.js` (in its success `onClose`) reads
`ReturnRoute` and navigates back here. This mechanism already existed for Self
booking; New/Existing reuse it unchanged.

### 3.4 The conflict we had to solve: `_prefillLoggedInUser`
`Booking.controller.js._prefillLoggedInUser()` runs on **every** navigation to the
booking page and **overwrites** the HostelModel customer fields (`UserID`,
`FullName`, `CustomerEmail`, `MobileNo`, etc.) with the **logged-in admin's**
`LoginModel`.

For Self booking that's correct. But for New/Existing it would *erase* the customer
we just seeded and replace them with the admin — breaking the whole feature. The
fix is a guard flag, `BookingOnBehalf` (see Section 7).

### 3.5 Shared reference models (Country/State/City)
`CountryModel`, `StateModel`, `CityModel` are loaded once at **component** level
(in `Component.js`). They are available from any controller via
`this.getOwnerComponent().getModel("CountryModel")`. The New Customer cascade reuses
them read-only (we never mutate them — filtered lists go into the dialog's own
model).

### 3.6 The validation utilities
`webapp/utils/validation.js` exposes reusable validators. Each accepts either an
event or, when passed `"ID"` as the second arg, a control directly:

| Function | Validates |
|----------|-----------|
| `_LCstrictValidationSelect(ctrl)` | A Select/ComboBox has a selected key |
| `_LCvalidateName(ctrl, "ID")` | Name (letters/spaces/dots, ≥2 letters) |
| `_LCvalidateEmail(ctrl, "ID")` | Email format |
| `_LCvalidateMandatoryField(ctrl, "ID")` | Field is non-empty |
| `_LCvalidateISDmobile(ctrl, std)` | Mobile number per ISD code (IN = 10 digits) |
| `_LCvalidateAddress(ctrl)` | Address non-empty |

The New Customer validation calls **the exact same set** as the login
`onSignUp` method, so the rules stay identical (just without password fields).

---

## 4. The UI Layer — `AdminBooking.fragment.xml`

### 4.1 The radio group (always visible)
Placed directly below the Rent field. It binds its selected index to the dialog
model and fires a handler on change:

```xml
<Label text="{i18n>adminBookingCustomerType}"/>
<RadioButtonGroup
    id="AB_id_CustomerType"
    columns="3"
    enabled="{= !!${AdminBookingModel>/BranchCode} &amp;&amp; !!${AdminBookingModel>/RoomKey} &amp;&amp; !!${AdminBookingModel>/SelectedPlan} }"
    valueStateText="{i18n>adminBookingCustomerTypeValueStateText}"
    selectedIndex="{AdminBookingModel>/CustomerTypeIndex}"
    select="onAdminBookingCustomerTypeChange">
    <RadioButton text="{i18n>adminBookingNewCustomer}"/>     <!-- index 0 -->
    <RadioButton text="{i18n>adminBookingExistingCustomer}"/><!-- index 1 -->
    <RadioButton text="{i18n>adminBookingSelfBooking}"/>     <!-- index 2 -->
</RadioButtonGroup>
```

- **Why an index + a string?** The index (`CustomerTypeIndex`) is what the
  `RadioButtonGroup` control needs; the string (`CustomerType` = `"New"`/
  `"Existing"`/`"Self"`) is what the rest of the code reads, because a name is far
  clearer than a magic number in `if` statements and visibility expressions.
- **No default selection** — `CustomerTypeIndex` starts at `-1`, so the admin must
  explicitly pick a mode before Book Now does anything for a customer.
- **Disabled until Branch + Room + Plan are selected** — the group is not editable
  until the three prerequisite booking fields are complete. Book Now also marks
  Branch, Room, Plan, and Booking For with error states and field-specific
  `valueStateText` if anything is missing.

### 4.2 Conditional sub-forms (visibility-driven)
Two extra `SimpleForm`s sit as siblings inside the dialog. Each is shown only when
its mode is active, using an expression binding:

```xml
<f:SimpleForm id="AB_id_NewCustomerForm"
    visible="{= ${AdminBookingModel>/CustomerType} === 'New' }"> ... </f:SimpleForm>

<f:SimpleForm id="AB_id_ExistingCustomerForm"
    visible="{= ${AdminBookingModel>/CustomerType} === 'Existing' }"> ... </f:SimpleForm>
```

- **Why visibility instead of separate dialogs?** Keeps a single dialog, single
  footer (Book Now/Cancel), and a single model — simpler state and no fragment
  juggling. Self mode shows neither sub-form, exactly matching the original UI.

### 4.3 New Customer form (Option A)
Mirrors the signup panel field-for-field **minus password**: **Email (first)**,
Salutation + Name, DOB, Gender, Country → State → City, ISD + Mobile, Address. All
controls use the `AB_id_NC_*` prefix and bind to `AdminBookingModel>/NC/*`.

- **Why Email first?** It's the identity key. On its `change` event
  (`onAdminBookingNCEmailExistsCheck`) we check globally whether the customer
  already exists *before* the admin bothers filling the rest of the form — see
  §6.4a. `liveChange` still runs the format validator.
- **DOB behavior:** the DatePicker is read-only via
  `BaseController._FragmentDatePickersReadOnly(...)`, opens from the picker icon,
  focuses around `2000-01-01`, and enforces a rolling DOB range: max = today,
  min = today minus 100 years.
- **Salutation drives Gender:** `Mr.` auto-selects `Male` and disables Gender;
  `Ms.`/`Mrs.` auto-select `Female` and disable Gender; `Dr.` clears Gender back to
  the `Select Gender` placeholder and leaves the field enabled for manual choice.

Notable bindings:
- Country list comes from the shared `CountryModel` (`items="{path:'CountryModel>/'}"`).
- **State and City lists come from the dialog's own model** (`/NCStates`, `/NCCities`),
  *not* the shared models. Reason: the cascade filters the master lists down to the
  chosen country/state, and we must not mutate the shared `StateModel`/`CityModel`
  that other screens depend on.

### 4.4 Existing Customer form (Option B)
- A **`MultiInput`** (tokenized, `maxTokens="1"`, `width="100%"`) with type-ahead
  suggestions:
  ```xml
  <MultiInput id="AB_id_EC_Email"
      maxTokens="1"
      width="100%"
      showSuggestion="true"
      startSuggestion="0"
      suggestionItems="{AdminBookingModel>/ECSuggestions}"
      suggest="onAdminBookingECEmailSuggest"
      change="onAdminBookingECEmailChange"
      suggestionItemSelected="onAdminBookingECEmailSelected"
      tokenUpdate="onAdminBookingECTokenUpdate">
      <suggestionItems>
          <c:Item key="{AdminBookingModel>EmailID}" text="{AdminBookingModel>EmailID}"/>
      </suggestionItems>
  </MultiInput>
  ```
  - **`startSuggestion="0"`** — suggestions are available immediately as the user
    types. The full customer directory is already cached in `/ECAllCustomers` from
    the one-time `HM_LoginUser` load (§6.4); `/ECSuggestions` is only the locally
    filtered subset for the current typed term.
  - **Why a `MultiInput` (one token) instead of a plain `Input`?** Picking a
    customer wraps the email in a single token and locks typing
    (`setValueHelpOnly(true)`) so it can't be half-edited. Removing the token's
    "X" (`tokenUpdate` → `onAdminBookingECTokenUpdate`) clears the selection and
    re-enables typing.
  - `suggest` fires as they type (local filter over the cached list);
    `suggestionItemSelected` fires when they pick one; `change` also supports an
    exact typed email match without another backend call.
  - After selection, token-guard logic prevents later focus/window-change events
    from clearing the selected customer's read-only details.
- Below it, **read-only** `Text` controls for Name, ISD+Mobile, DOB, Gender,
  Address. They simply display `AdminBookingModel>/EC/*`, which the selection
  handler fills in. The mobile field concatenates STD + number with an expression
  binding.

---

## 5. The Dialog Model — `AdminBookingModel`

A single JSON model holds all dialog state. It is created in
`TileV_onpressBookForYourself` and (re)initialized via `_getAdminBookingInitialData`:

```js
{
  Branches, Rooms, AllRooms, Plans, BranchCode, RoomKey, SelectedPlan, RentDisplay, // original
  DOBFocusedDate, DOBMinDate, DOBMaxDate, // New Customer DOB picker range/focus
  CustomerType: "",              // "" (none) | "New" | "Existing" | "Self"
  CustomerTypeIndex: -1,         // -1 = nothing selected initially
  NC: { Salutation, UserName, DateOfBirth, Gender, EmailID,
        Country, State, City, STDCode, MobileNo, Address },  // New Customer form
  NCStates: [],                  // filtered state list for the cascade
  NCCities: [],                  // filtered city list for the cascade
  EC: { UserID, Salutation, UserName, EmailID, STDCode, MobileNo,
        DateOfBirth, Gender, Country, State, City, Address },// selected existing customer
  ECSuggestions: [],             // {EmailID, UserID} shown in the dropdown (filtered locally)
  ECAllCustomers: []             // full cached HM_LoginUser rows (unfiltered global list)
}
```

> **Radio indices:** New (0) | Existing (1) | Self (2). Nothing is pre-selected
> (`CustomerTypeIndex: -1`), so the admin must explicitly choose a mode.

- `_getEmptyNewCustomer()` / `_getEmptyExistingCustomer()` are factory helpers so we
  can reset cleanly in multiple places without duplicating the shape.
- `_resetAdminBookingModel()` resets everything (keeping the already-loaded branch
  list) each time the dialog opens, so no stale data leaks between sessions.
- `_getAdminBookingDOBRange()` computes the rolling DOB range used by the New
  Customer DatePicker: max today, min 100 years before today, focused date around
  `2000-01-01` when within range.
- Existing-customer directory rows are cached in controller memory
  (`_aAdminBookingExistingCustomersCache`) and reused across model resets during the
  same dialog lifecycle.

---

## 6. The Controller Logic — `TilePage.controller.js`

### 6.1 Switching modes
`onAdminBookingCustomerTypeChange(oEvent)`:
- Maps the selected index → `"New"` (0) / `"Existing"` (1) / `"Self"` (2) and
  stores both.
- **Resets both sub-forms** (`NC`, `NCStates`, `NCCities`, `EC`, `ECSuggestions`,
  selected `EC`), clears the email token and value states. *Why:* switching modes
  must never carry half-entered data from another mode into the booking.
- Keeps the cached global existing-customer list (`ECAllCustomers`) instead of
  clearing it, because that list is loaded once from `HM_LoginUser` and filtered
  locally.
- When **Existing** is chosen, it ensures `_loadAdminBookingExistingCustomers()` has
  loaded the unfiltered global directory (see §6.4).

### 6.2 New Customer field handlers
These mirror the login/admin-signup handlers, adapted to `this.byId(...)` and the
`/NC/*` model paths:

| Handler | What it does |
|---------|--------------|
| `onAdminBookingNCSalutationChange` | Mirrors signup salutation logic: `Mr.` → Male disabled, `Ms.`/`Mrs.` → Female disabled, `Dr.` → gender enabled/manual |
| `onAdminBookingNCNameLive` | Live name validation |
| `onAdminBookingNCEmailLive` | Live email validation |
| `onAdminBookingNCDOBChange` | Validates against rolling DOB range (today minus 100 years through today), stores `yyyy-MM-dd`, **returns boolean** |
| `onAdminBookingNCCountryChange` | Fuzzy-matches the country, filters states into `/NCStates`, auto-selects STD, sets mobile maxLength |
| `onAdminBookingNCStateChange` | Fuzzy-matches the state, filters cities into `/NCCities` |
| `onAdminBookingNCCityChange` | Fuzzy-matches the city |
| `onAdminBookingNCSTDChange` | Validates the ISD code format (`+` then no leading zero) |
| `onAdminBookingNCMobileLive` | Validates mobile against the chosen ISD code |
| `_findBestMatch` | Local copy of the fuzzy matcher (exact match first, then normalized contains) |
| `_autoSelectNCSTD` | Picks the STD code item matching the country code |

- **Why a local `_findBestMatch`?** The original lives in `Hostel.controller.js`
  and isn't shared. Copying the small helper keeps TilePage self-contained rather
  than creating a fragile cross-controller dependency.
- The DOB DatePicker is made read-only with `BaseController._FragmentDatePickersReadOnly`
  after fragment load/reopen, using the view-created fragment ID because this
  fragment is loaded with the view ID.

### 6.3 New Customer validation gate
`_validateAdminBookingNewCustomer()` calls the same validator set as signup (minus
password fields), but in the **dialog's visible field order** because Email was
moved to the top:

```js
return (
    utils._LCvalidateEmail(this.byId("AB_id_NC_Email"), "ID") &&
    utils._LCstrictValidationSelect(this.byId("AB_id_NC_Salutation")) &&
    utils._LCvalidateName(this.byId("AB_id_NC_Name"), "ID") &&
    this.onAdminBookingNCDOBChange(this.byId("AB_id_NC_DOB")) &&
    utils._LCstrictValidationSelect(this.byId("AB_id_NC_Gender")) &&
    utils._LCvalidateMandatoryField(this.byId("AB_id_NC_Country"), "ID") &&
    utils._LCvalidateMandatoryField(this.byId("AB_id_NC_State"), "ID") &&
    utils._LCvalidateMandatoryField(this.byId("AB_id_NC_City"), "ID") &&
    utils._LCvalidateMandatoryField(this.byId("AB_id_NC_STD"), "ID") &&
    utils._LCvalidateISDmobile(this.byId("AB_id_NC_Mobile"), sSTD) &&
    utils._LCvalidateAddress(this.byId("AB_id_NC_Address"))
);
```

The top booking fields are validated separately by `_validateAdminBookingBaseFields()`:
Branch, Room, Room Plan, and Booking For all receive error value states with
field-specific `valueStateText` before Book Now dispatches to Self/New/Existing.

### 6.4 Existing Customer lookup

This part evolved across several iterations. The endpoint history matters:

1. **First cut used `HM_Login` to *list*** — wrong. `HM_Login` is the
   login/session endpoint: filtering it by `{ Role: "Customer" }` is ignored and it
   returns only the *currently logged-in* user, so the dropdown only ever showed
   the admin.
2. **Then `HM_CustomerContact`** (the Coupon "Email to Customers" directory) +
   a per-selection `HM_Login` read for the full record — worked, but needed two
   endpoints and a follow-up read because `HM_CustomerContact` rows are
   summary-only (no `UserID`).
3. **Now `HM_LoginUser`** — a dedicated backend directory endpoint that returns
   every email/customer row without requiring a filter:
    ```js
    ajaxReadWithJQuery("HM_LoginUser", {})
    ```
    The dialog loads it once when the Admin Booking fragment opens, caches the
    rows in `_aAdminBookingExistingCustomersCache`, and filters the cached list
    locally while the user types. This avoids the secure `HM_Login` endpoint,
    which only supports single-record reads.

The flow is three steps:

**1. Load the directory (`_loadAdminBookingExistingCustomers`)** — fired once when
the Admin Booking fragment opens (and reused from cache afterward):
- Reads `HM_LoginUser` with `{}` and caches the full rows in
  `_aAdminBookingExistingCustomersCache` and `/ECAllCustomers`.
- No branch or role filtering is applied here; the search is global.

**2. Type to filter (`onAdminBookingECEmailSuggest`)** — filters the cached global
list locally (partial `contains` match on email) into `/ECSuggestions`, so
suggestions update in real time with no extra backend calls. If the typed term
matches nothing, it shows the "No matching customer found" toast **once per
distinct term** (tracked in `_sLastNoMatchTerm`) so it doesn't repeat on every
keystroke.

**3. Exact match / pick one (`onAdminBookingECEmailChange` / `onAdminBookingECEmailSelected`)** — when an exact email is entered or selected, it:
- Wraps the email in a single token and locks the `MultiInput`.
- Populates `/EC/*` from the cached `HM_LoginUser` row — Name, ISD+Mobile, DOB,
  Gender, Address, and `UserID`.
- **DOB is formatted** locally to `dd/MM/yyyy` so the raw value stays usable for
  booking while still showing a readable date.
- Keeps the selected customer intact across focus/window changes using a token
  guard so the read-only details do not disappear.

> **Scope note:** the Existing Customer list is global now. The Branch dropdown is
> still scoped to the admin's allotted branches via `_getAdminBookingAssignedBranches()`,
> which reads the admin's own `HM_CustomerContact` record.

### 6.4a New Customer: email-first existence check & reuse

Identity in `HM_Login` is **global and keyed by email**, but the Existing-Customer
list is scoped to the **selected branch**. So a person can be *new to this branch*
yet already exist in the system (they booked at another branch). A blind insert
would fail on the duplicate email, and the customer wouldn't appear in this
branch's Existing list either — a dead end.

The solution is an **upsert-by-email**, surfaced as early as possible:

- **Email is the first field** in the New Customer form. On its `change`
  (`onAdminBookingNCEmailExistsCheck`):
  - Validates format, then does a **global** lookup: `HM_Login({ EmailID })` with
    **no branch filter**.
  - **Found** → seed `HostelModel` (needs branch/room/plan; toasts if missing),
    then `_confirmAdminBookingReuseExisting`:
    - **OK** → reuse that record (`_applyAdminBookingCustomerIdentity`) and go
      **straight to the booking page** — the rest of the form is irrelevant. The
      booking's `BranchCode` is what associates them with this branch.
    - **Cancel** → clears the email field and refocuses it for a different entry.
  - **Not found** → silent; the admin keeps filling the form for a genuine new
    registration.
  - **Errors / not found** → swallowed (a flaky pre-check must never block a
    legitimate create); the Book Now path still guards and then creates.

- **Book Now safety net (`_adminBookingBookNowNewCustomer`)** repeats the same
  global check before creating, covering the case where the admin typed the email
  last or skipped its `change` event:
  - Found → same reuse confirm.
  - Not found → `_adminBookingCreateAndBookNewCustomer` (POST `HM_Login` → read back
    → book), the original create path.

This keeps **one global `HM_Login` row per person** (no per-branch duplicates) and
turns the duplicate-email dead end into a one-click "reuse" — branch membership is
implied by the booking itself.

### 6.5 Book Now dispatch
`onAdminBookingBookNow()` reads `CustomerType` and routes to one of three private
methods:

**Self — `_adminBookingBookNowSelf()`**
1. `_seedAdminBookingHostelModel()` (branch/room/plan/prices + `ReturnRoute`).
2. Sets `BookingOnBehalf = false`.
3. Closes dialog, navigates to `RouteBooking`. (Identical to the original behavior.)

**New — `_adminBookingBookNowNewCustomer()` (async)**
1. Seed HostelModel; bail if branch/room/plan missing.
2. Validate the New Customer form in visible field order; bail with a toast if
   invalid.
3. **Global email check** — `HM_Login({ EmailID })` (no branch filter):
   - Found → `_confirmAdminBookingReuseExisting` (reuse → book, or cancel → clear
     email). See §6.4a.
   - Not found / backend auth-style error → continue to create.
4. Build the **same registration payload shape as `onSignUp`** (Role/Type =
   `Customer`, Status `Active`, etc.). The current implementation omits `Password`
   because the admin-created flow is intended to work without a login credential.
5. `POST` to `HM_Login` (`ajaxCreateWithJQuery`).
6. Read back the new row by email to obtain the authoritative record
   (`HM_Login({ EmailID })` or the cached directory if already available).
7. `_applyAdminBookingCustomerIdentity(...)` overlays that customer onto HostelModel
   and sets `BookingOnBehalf = true`; close dialog, navigate to `RouteBooking`.

> The same global check also runs **earlier**, on the Email field's `change` event
> (§6.4a), so the duplicate is usually caught before the admin fills the rest of
> the form. This Book Now check is the safety net.

**Existing — `_adminBookingBookNowExistingCustomer()`**
1. Require a selected `EC` (must have `UserID` + `EmailID`); else error state + toast.
2. Seed HostelModel.
3. `_applyAdminBookingCustomerIdentity(...)` with the selected record; sets
   `BookingOnBehalf = true`.
4. Close dialog, navigate to `RouteBooking`.

### 6.6 The seeding & branch helpers
- `_seedAdminBookingHostelModel()` — builds the **room/branch/plan** half of
  HostelModel (prices, GST, capacity, check-in/out, `ReturnRoute: "TilePage"`).
  Returns the model, or `null` if branch/room/plan are incomplete.
- `_applyAdminBookingCustomerIdentity(oHostelModel, oCustomer)` — overlays the
  **customer** half (`UserID`, `FullName`, `CustomerEmail`, `MobileNo`, `Gender`,
  `DateOfBirth`, address, etc.) and, critically, sets `BookingOnBehalf = true`.
  This is what makes the booking belong to the customer, not the admin.
- `_getAdminBookingAssignedBranches()` — resolves the logged-in user's own allotted
  branch codes from **their** `HM_CustomerContact` record (by `UserID`/`EmployeeID`),
  the same source the BranchData "Property Name" filter uses. Returns `""` for
  SuperAdmin ("all branches"), falls back to `LoginModel.BranchCode` on read
  failure, cached per dialog open. **Used only by the Branch dropdown loader**
  (`_loadAdminBookingBranches`); the existing-customer list is scoped by the
  *selected* branch via `HM_Logindata`, not this helper.

> **Why not `mainModel` for assigned branches?** An earlier version derived them
> from `mainModel`, but that model isn't populated on the TilePage (it's set by the
> BranchData/ManageStaff controllers), so every admin saw every branch. Reading the
> user's own `HM_CustomerContact` record is the reliable source.

---

## 7. The Booking-Page Guard — `Booking.controller.js`

The single change outside the dialog. `_prefillLoggedInUser()` normally overwrites
the customer fields with the admin's `LoginModel` on every navigation. We add an
early exit when booking on behalf:

```js
_prefillLoggedInUser: function () {
    const oLoginModel  = sap.ui.getCore().getModel("LoginModel") || this.getView().getModel("LoginModel");
    const oHostelModel = this.getView().getModel("HostelModel");
    if (!oLoginModel || !oHostelModel) { return; }

    // Book for Yourself → New/Existing customer: keep the seeded customer,
    // do NOT overwrite with the logged-in admin.
    if (oHostelModel.getProperty("/BookingOnBehalf")) {
        this._syncPrimaryMemberInFamilyMembers();
        return;
    }
    // ... original admin prefill continues for Self booking ...
}
```

- **Why here?** This is the *only* place the admin identity would clobber the
  customer. Guarding it is the minimal, surgical fix.
- **Why still call `_syncPrimaryMemberInFamilyMembers()`?** So the booking's primary
  occupant row is built from the (already-seeded) customer data, exactly as it would
  be for the logged-in user.

---

## 8. End-to-End Flow (When things happen)

**New Customer**
```
Admin clicks tile → dialog opens (no mode pre-selected)
 → picks Branch/Room/Plan → Rent shows
 → selects "New Customer" → form appears (Email is the first field)
 → types Email → on change: global HM_Login({EmailID}) check
     → FOUND  → "Customer exists, reuse?" → OK  → reuse → navTo RouteBooking
                                            → Cancel → clear email, keep going
     → NOT FOUND → keep filling the form
 → fills remaining fields (cascade + validation live)
 → Book Now
     → validate form
     → global HM_Login({EmailID}) check again (safety net)
         → FOUND → reuse confirm
         → NOT FOUND → POST HM_Login (no password) → READ back → get UserID
     → seed HostelModel (room + customer), BookingOnBehalf=true, ReturnRoute=TilePage
     → navTo RouteBooking
 → Booking page: _prefillLoggedInUser sees BookingOnBehalf → keeps customer
 → admin completes booking → success → ReturnRoute → back to TilePage
```

**Existing Customer**
```
... picks Branch/Room/Plan → selects "Existing Customer"
 → load directory: HM_Logindata({ BranchCode: selected branch })
   → full rows, filtered to bookable roles → cache + suggestions
 → focus email field → full list shows (startSuggestion=0)
 → types email → suggestions filtered LOCALLY from the cache
   (toast "No matching customer found" once per unmatched term)
 → picks one → read-only fields fill FROM CACHE (DOB formatted), no extra call
 → (changing the branch reloads the list for the new branch)
 → Book Now
     → require selected customer (UserID + EmailID)
     → seed HostelModel (room + customer), BookingOnBehalf=true, ReturnRoute=TilePage
     → navTo RouteBooking → (same as above) → back to TilePage
```

**Self** — unchanged: seed room + (admin via normal prefill) → book → return.

---

## 9. i18n Keys Added (`i18n.properties`)

```
adminBookingTitle, adminBookingBranch, adminBookingBranchPlaceholder,
adminBookingRoom, adminBookingRoomPlaceholder, adminBookingPlan,
adminBookingPlanPlaceholder, adminBookingRent,
adminBookingCustomerType, adminBookingSelfBooking, adminBookingNewCustomer,
adminBookingExistingCustomer,
adminBookingBranchValueStateText, adminBookingRoomValueStateText,
adminBookingPlanValueStateText, adminBookingCustomerTypeValueStateText,
adminBookingNCPersonalDetails, adminBookingNCContactDetails, adminBookingNCFullName,
adminBookingNCDOB, adminBookingNCGender, adminBookingNCEmail, adminBookingNCCountry,
adminBookingNCState, adminBookingNCCity, adminBookingNCMobile, adminBookingNCAddress,
adminBookingECEmail, adminBookingECEmailPlaceholder, adminBookingECName,
adminBookingECMobile, adminBookingECDOB, adminBookingECGender, adminBookingECAddress,
adminBookingBookNow, adminBookingCancel,
adminBookingSelectCustomerType, adminBookingSelectCustomerEmail,
adminBookingSelectBranchRoomPlan, adminBookingNoBranches,
adminBookingNCFillAllFields, adminBookingRegisterFailed,
adminBookingCustomerReadFailed, adminBookingECNoResults,
adminBookingEmailExistsTitle, adminBookingEmailExistsReuse
```

---

## 10. How to Test (Verification Checklist)

1. **Self:** open dialog → Branch/Room/Plan → Booking For enables → Book Now → booking page shows the
    logged-in admin as customer → complete → returns to TilePage.
2. **New (genuinely new):** select New Customer → type a brand-new email, tab out
    → no prompt. Fill the rest correctly → Book Now → network tab shows the global
    `GET HM_Login` existence check, then `POST HM_Login` → booking page shows the
    **new** customer → complete → returns to TilePage. Confirm the record exists.
3. **New (already exists / cross-branch):** select New Customer → type an email that
    already exists (e.g. a customer from another branch), tab out → "Customer Already
    Exists" confirm appears → **OK** → goes straight to booking with that customer
    (no new `HM_Login` row created) → **Cancel** → email field clears and refocuses.
4. **Existing:** select Existing Customer once Branch/Room/Plan are chosen → the
    global list is already cached from `HM_LoginUser` → type a few chars → local
    filter updates suggestions in real time → unknown email toasts "No matching
    customer found" once (not per keystroke) → pick one or tab out on an exact email
    → read-only fields populate from cache, DOB shows as `dd/MM/yyyy` → Book Now →
    booking shows that customer → returns to TilePage.
5. **Branch change:** changing Branch clears dependent room/plan/customer state,
    but it does not re-scope the Existing customer directory.
6. **Branch scope:** the Branch dropdown still shows only the admin's allotted
    branches; the Existing list is global (`HM_LoginUser`) and is filtered only by
    the typed email.
7. **Mode switching:** fill New form partially, switch to Existing and back → form
   is cleared (no stale data).
8. **Console:** no errors on open, switch, or Book Now.

---

## 11. Known Caveats / Future Work

- **`HM_Login` cannot list users** — it returns only the logged-in user. Listing the
  Existing-Customer dropdown uses the dedicated **`HM_Logindata`** service
  (`{ BranchCode }` → full rows for that branch). This replaced the earlier
  `HM_CustomerContact` + per-selection `HM_Login` two-call approach.
- **Existing-customer directory is global** — the dropdown/cache is loaded once from
  `HM_LoginUser` with no branch or role filters, then filtered locally by email.
  The Branch *dropdown* is still scoped to the admin's allotted branches via
  `_getAdminBookingAssignedBranches()`.
- **New-customer is an upsert-by-email** — `HM_Login` identity is global and keyed by
  email, so a customer new to *this* branch but existing in the system is offered for
  **reuse** (no duplicate row). The check runs on the Email field's `change` and again
  at Book Now (safety net). The create step currently omits `Password` in code; if the
  backend starts requiring it, the payload will need to be aligned.
- **Static verification only** — at implementation time the command runner was
  unavailable, so `node --check` / dev-server run were not performed. Run the app and
  the checklist above before shipping.
