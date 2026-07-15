sap.ui.define([
    "./Booking.controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "../utils/validation",
    "../model/formatter",
], function (BookingController, JSONModel, MessageBox, MessageToast, utils, Formatter) {
    "use strict";
    return BookingController.extend("sap.ui.com.project1.controller.EditBooking", {
        Formatter: Formatter,
        onInit: function () {
            this._bEditMode = true;

            this.getOwnerComponent().getRouter().getRoute("RouteEditBooking").attachMatched(this._onEditRouteMatched, this);

            // Hide the home button from the shared BookingHeader fragment for this page only
            var oHomeBtn = this.byId("headerHomeBtn");
            if (oHomeBtn) {
                oHomeBtn.setVisible(false);
            }

            this._iFacilityStartIndex = 0;
            this._iFacilityPageSize = 3; // fallback; recalculated dynamically
            this._iFacilityCardWidth = 250;
            this._iFacilityCardGap = 16;
            this._sLastPrimaryMemberId = "SELF";
            // Initialize member data loading flags
            this._bMemberDataLoaded = false;
            this._bMemberDataLoading = false;

            // Resize observer to recalculate visible card count
            this._fnFacilityResizeHandler = this._onFacilityCarouselResize.bind(this);
            sap.ui.core.ResizeHandler.register(this.getView(), this._fnFacilityResizeHandler);

            this.getView().addEventDelegate({
                onBeforeHide: function () {
                    this._resetBookingPageModels();
                }.bind(this)
            });

            // Login View Model
            var oLoginViewModel = new sap.ui.model.json.JSONModel({
                showOTPField: false,
                isOtpEntered: false,
                canResendOTP: true,
                otpTimer: 0,
                otpButtonText: "Send OTP"
            });

            this.getView().setModel(oLoginViewModel, "LoginViewModel");

            // Login Mode Model
            this.getView().setModel(new JSONModel({
                fullname: "",
                Email: "",
                Mobileno: "",
                password: "",
                comfirmpass: "",
                minDate: new Date(2000, 0, 1)
            }), "LoginMode");



            this._fnTableResizeHandler =
                this._updateTableColumnWidths.bind(this);

            this._updateTableColumnWidths();

            window.addEventListener(
                "resize",
                this._fnTableResizeHandler
            );

        },
        onExit: function () {

            if (this._fnTableResizeHandler) {

                window.removeEventListener(
                    "resize",
                    this._fnTableResizeHandler
                );

                this._fnTableResizeHandler = null;
            }

            BookingController.prototype.onExit.apply(
                this,
                arguments
            );
        },
        _updateTableColumnWidths: function () {

            var bMobile = sap.ui.Device.system.phone;

            var oPrimaryColumn = this.byId("EditprimaryColumn");
            var oActionColumn = this.byId("EditactionColumn");

            if (oPrimaryColumn) {
                oPrimaryColumn.setWidth(
                    bMobile ? "3rem" : "6rem"
                );
            }

            if (oActionColumn) {
                oActionColumn.setWidth(
                    bMobile ? "3rem" : "6rem"
                );
            }
        },
        onAfterRendering: function () {
            BookingController.prototype.onAfterRendering.apply(this, arguments);

            this._updateTableColumnWidths();
        },
        _onEditRouteMatched: async function (oEvent) {
            // if (performance.navigation && performance.navigation.type === 1) {
            //     var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            //     oRouter.navTo("RouteHostel", {}, true);
            // }
            let oArgs;

            // Case 1: called from router
            if (oEvent && typeof oEvent.getParameter === "function") {
                oArgs = oEvent.getParameter("arguments") || {};
                this._pendingEditArgs = oArgs;
            }
            // Case 2: called manually after login
            else if (this._pendingEditArgs) {
                oArgs = this._pendingEditArgs;
            }
            // Case 3: nothing available
            else {
                return;
            }

            // now safely use oArgs
            this._processEditArgs = oArgs;
            this.BookingID = oArgs.BookingID ? atob(decodeURIComponent(oArgs.BookingID)) : "";
            var oRouteQuery = oArgs["?query"] || oArgs.query || {};
            this._sReturnRouteAfterEdit = oRouteQuery.FromMyBookings === "true" || oRouteQuery.FromMyBookings === true ? "RouteMyBookings" : "RouteManageProfile";

            var sBookingID = this.BookingID;
            var sMemberID = oArgs.MemberID ? atob(decodeURIComponent(oArgs.MemberID)) : "";

            if (!sBookingID) {
                MessageBox.error("Booking ID is required for editing.");
                return;
            }

            // Allow access only when the current login belongs to this deeplink booking owner.
            // A different/no active user must complete OTP, which then becomes the active login.
            var bAccessAllowed = false;
            try {
                this.getBusyDialog();
                var oPreFetch = await this.ajaxReadWithJQuery("HM_Customer", {
                    BookingID: sBookingID,
                    MemberID: sMemberID
                });
                this.closeBusyDialog();
                this._oPrefetchedCustomerResponse = oPreFetch;
                var sOwnerUserID = (oPreFetch && oPreFetch.Customers && oPreFetch.Customers.UserID) || "";
                bAccessAllowed = this._isBookingAccessAllowed(sOwnerUserID);
            } catch (e) {
                this.closeBusyDialog();
            }

            if (!bAccessAllowed) {
                this._bPendingEditRoute = true;
                this.getView().addStyleClass("blur-background");

                MessageBox.information(
                    "Please verify with OTP to access your booking.",
                    {
                        title: "Verification Required",
                        styleClass: "myUnifiedBtn",
                        actions: [MessageBox.Action.OK],
                        emphasizedAction: MessageBox.Action.OK,

                        onClose: function () {
                            if (!this._oLoginAlertDialog) {
                                this._oLoginAlertDialog = sap.ui.xmlfragment(
                                    this.createId("LoginAlertDialog"),
                                    "sap.ui.com.project1.fragment.AdminDetailsSignin",
                                    this
                                );
                                this.getView().addDependent(this._oLoginAlertDialog);
                            }
                            this._oLoginAlertDialog.open();
                        }.bind(this)
                    }
                );
                return;
            }

            var LoginFUnction = await this.commonLoginFunction("Booking");
            if (!LoginFUnction) return;

            var oHostelModel = sap.ui.getCore().getModel("HostelModel");
            if (!oHostelModel) {
                oHostelModel = new JSONModel({});
                sap.ui.getCore().setModel(oHostelModel, "HostelModel");
            }

            // Clear any existing backups when loading a new booking
            this._backupHostelModel = null;
            this._backupBookingView = null;
            this._backupFacilityModel = null;
            this._backupFacilitySelection = null;
            this._backupAllFacilities = null;

            // Initialize BookingView model with edit mode properties
            var oBookingViewData = this._getBookingViewInitialData ? this._getBookingViewInitialData() : this._getDefaultBookingViewData();
            oBookingViewData.editModeEnabled = false; // Start in read-only mode
            oBookingViewData.isStatusNew = false; // Will be set after loading
            oBookingViewData.isAdminUpdatedYes = false; // Will be set after loading
            oBookingViewData.isWithin48HoursOfCheckIn = false; // Will be set after loading
            oBookingViewData.showEditButton = false; // Will be set after loading

            this.getView().setModel(oHostelModel, "HostelModel");
            this.getView().setModel(new JSONModel(oBookingViewData), "BookingView");
            this.getView().setModel(new JSONModel(this._getFacilityModelInitialData ? this._getFacilityModelInitialData() : this._getDefaultFacilityData()), "FacilityModel");
            this.getView().setModel(new JSONModel(this._getFacilitySelectionInitialData ? this._getFacilitySelectionInitialData() : this._getDefaultFacilitySelectionData()), "FacilitySelection");
            this.getView().setModel(new JSONModel(this._getPaymentModelInitialData ? this._getPaymentModelInitialData() : this._getDefaultPaymentData()), "PaymentModel");

            this._resetBookingPageModels();

            try {
                this.getBusyDialog()
                // 1. Fetch booking data using HM_Customer (reuse pre-fetched response if available)
                var oResponse = this._oPrefetchedCustomerResponse || await this.ajaxReadWithJQuery("HM_Customer", {
                    BookingID: sBookingID,
                    MemberID: sMemberID
                });
                this._oPrefetchedCustomerResponse = null;

                var oCustomer = oResponse && oResponse.Customers || oResponse && oResponse.value && oResponse.value[0] || {};
                var oBooking = (Array.isArray(oCustomer.Bookings) ? oCustomer.Bookings[0] : oCustomer.Bookings) || {};
                var sBranchCode = oBooking.BranchCode || "";
                var sStatus = oBooking.Status || "";
                var sAdminUpdated = oBooking.AdminUpdated || "";

                // Store original booking dates for condition 1/2 facility determination
                this._sOriginalBookingStartDate = oBooking.StartDate || "";
                this._sOriginalBookingEndDate = oBooking.EndDate || "";

                // 2. Parallel API calls for branch-related data, payments, and facilities
                var oRoomData = {};
                var oPricingData = {};
                var oBranchData = {};
                var aExistingPayments = [];
                var oFacilitiesResponse = null;

                try {
                    // Create an array of promises for parallel execution
                    var aPromises = [];

                    // Add branch-related API calls only if branch code exists
                    if (sBranchCode) {
                        aPromises.push(
                            this.ajaxReadWithJQuery("BookingBedTypeRoomReadCall", { BranchCode: sBranchCode })
                                .then(function (oBedTypeResp) {
                                    return { type: "bedType", data: oBedTypeResp };
                                })
                        );
                        aPromises.push(
                            this.ajaxReadWithJQuery("getBranchHotelData", { BranchCode: sBranchCode, BranchID: sBranchCode })
                                .then(function (oBranchResp) {
                                    return { type: "branch", data: oBranchResp };
                                })
                        );
                        // Load facilities in parallel too
                        aPromises.push(
                            this.ajaxReadWithJQuery("HM_Facilities", { BranchCode: sBranchCode })
                                .then(function (oFacResp) {
                                    return { type: "facilities", data: oFacResp };
                                })
                        );
                    }

                    // Payment call is independent and can run in parallel
                    aPromises.push(
                        this._readEditPaymentsByBookingId(sBookingID)
                            .then(function (oPayments) {
                                return { type: "payments", data: oPayments };
                            })
                    );

                    // Execute all promises in parallel
                    var aResults = await Promise.all(aPromises);

                    // Process results
                    aResults.forEach(function (oResult) {
                        if (oResult.type === "bedType" && oResult.data) {
                            var aBedTypes = (oResult.data.data && oResult.data.data.HM_BedType) || [];
                            var aRooms = (oResult.data.data && oResult.data.data.HM_Rooms) || [];

                            // Find matching bed type by Name + ACType
                            var sBedType = oBooking.BedType || "";
                            var sBedName = sBedType.replace(/\s*-\s*(AC|NON-AC)$/i, "").trim();
                            var sACType = sBedType.indexOf("NON-AC") >= 0 ? "NON-AC" : "AC";
                            oRoomData = aBedTypes.find(function (b) {
                                return b.Name === sBedName && b.BranchCode === sBranchCode && b.ACType === sACType;
                            }) || aBedTypes.find(function (b) {
                                return b.BranchCode === sBranchCode;
                            }) || {};

                            // Find matching room for pricing
                            var sBedTypeName = (oRoomData.Name || sBedName) + " - " + (oRoomData.ACType || sACType);
                            oPricingData = aRooms.find(function (r) {
                                return r.BranchCode === sBranchCode && r.BedTypeName && r.BedTypeName.trim().toLowerCase() === sBedTypeName.trim().toLowerCase();
                            }) || aRooms.find(function (r) {
                                return r.BranchCode === sBranchCode;
                            }) || {};
                        } else if (oResult.type === "branch" && oResult.data) {
                            var aBranches = (oResult.data.HM_Branch) || [];
                            oBranchData = aBranches.find(function (b) {
                                return b.BranchID === sBranchCode;
                            }) || aBranches[0] || {};
                        } else if (oResult.type === "payments") {
                            aExistingPayments = oResult.data || [];
                        } else if (oResult.type === "facilities" && oResult.data) {
                            oFacilitiesResponse = oResult.data;
                        }
                    });

                } catch (e) {
                    // Any API failure — continue with booking data only
                    console.warn("Parallel API calls failed:", e);
                    // Fallback: try to get payments separately
                    try {
                        aExistingPayments = await this._readEditPaymentsByBookingId(sBookingID);
                    } catch (payErr) {
                        // Ignore payment fetch error
                    }
                }

                // 3. Also fetch member documents (like onConfirmBooking does) - non-blocking background load
                var aMemberDocs = [];
                // Start background loading for member data (for F4 help)
                // The actual member documents for edit data will be loaded asynchronously
                // UserID will be set by _prefillLoggedInUser called later

                var oEditData = this._normalizeBookingEditData(oResponse, sBookingID, oBranchData, oRoomData, oPricingData, aMemberDocs);
                var fPaymentPaidAmount = this._getEditPaymentPaidAmount(aExistingPayments);
                oEditData.CustomerEmail = this.CustomerEmail || "";

                oHostelModel.setData(oEditData);
                oHostelModel.setProperty("/IsEditMode", true);
                oHostelModel.setProperty("/BookingID", sBookingID);
                oHostelModel.setProperty("/EditMemberID", sMemberID);
                oHostelModel.setProperty("/HasExistingPayments", aExistingPayments.length > 0);
                oHostelModel.setProperty("/PaymentPaidAmount", fPaymentPaidAmount);

                this._initializeBookingData();
                this._prefillLoggedInUser();
                // Start background loading of member data for F4 help
                this._loadMemberDataInBackground();
                this._syncPropertyTypeState();
                this._syncPlanState();
                this._applySelectedPlanPrice();

                // Process facilities if we got them in parallel
                if (oFacilitiesResponse) {
                    this._aAllFacilities = oFacilitiesResponse.data || [];
                    this._processFacilitiesForEdit();
                } else {
                    // Fallback: load facilities separately
                    await this._loadFacilities();
                }

                // Load advertisements in parallel with UI updates
                this._loadAdvertisements().catch(function (e) {
                    console.warn("Advertisement load failed:", e);
                });

                this._rebuildSelectedFacilities();

                // Load coupon data in background - will recalculate summary when ready
                this._hydrateAppliedCouponData().then((function () {
                    this._recalculateSummary();
                }).bind(this));

                this._recalculateSummary();
                // Don't make date pickers read-only here - they're controlled by editModeEnabled binding
                oHostelModel.refresh(true);

                // Check if status is "New" and update BookingView model accordingly
                var oBookingView = this.getView().getModel("BookingView");
                var bIsStatusNew = sStatus === "New";
                var bIsStatusConfirmed = sStatus === "Confirmed";
                var bIsEditableStatus = bIsStatusNew || bIsStatusConfirmed;
                var bIsAdminUpdatedYes = sAdminUpdated === "YES";
                var sBookingStartDate = oBooking.StartDate || "";
                var sCheckInTime = oHostelModel.getProperty("/CheckInTime") || "";
                var sEditBeforeValue = (oBranchData && oBranchData.EditBefore != null) ? oBranchData.EditBefore : "";
                var bIsWithin48Hours = this._isWithin48HoursOfCheckIn(sBookingStartDate, sCheckInTime, sEditBeforeValue);
                oBookingView.setProperty("/isStatusNew", bIsStatusNew);
                oBookingView.setProperty("/isAdminUpdatedYes", bIsAdminUpdatedYes);
                oBookingView.setProperty("/isWithin48HoursOfCheckIn", bIsWithin48Hours);
                oBookingView.setProperty("/showEditButton", bIsEditableStatus && !bIsAdminUpdatedYes && !bIsWithin48Hours);
                oBookingView.setProperty("/editModeEnabled", false);

                if (bIsEditableStatus && !bIsAdminUpdatedYes && bIsWithin48Hours) {
                    var sCheckInDisplay = sCheckInTime || "12:00 PM";
                    var iHoursWindow = this._iEditHoursWindow || 0;
                    MessageBox.warning(
                        "Editing is no longer allowed as the check-in time is within " + iHoursWindow + " hours. " +
                        "Check-in is at " + sCheckInDisplay + " on " + this._formatDateToDDMMYYYY(this._parseDate(sBookingStartDate)) + ".\n\n" +
                        "For any changes, please contact " + (oHostelModel.getProperty("/Area") || "") + ".",
                        {
                            title: "Editing Not Available",
                            styleClass: "myUnifiedBtn",
                            contentWidth: "460px",
                            actions: [MessageBox.Action.OK]
                        }
                    );
                }

                if (bIsEditableStatus && bIsAdminUpdatedYes) {
                    var sBranchName = oHostelModel.getProperty("/Area") || "";
                    MessageBox.warning(
                        "This booking has been updated as per your request. To make any further changes, please contact " + sBranchName + ". \n\nThank you for your cooperation!\n",
                        {
                            title: "Booking Status Updated",
                            styleClass: "myUnifiedBtn",
                            contentWidth: "500px",
                            actions: [MessageBox.Action.OK]
                        }
                    );
                }

            } catch (oError) {
                console.error("Edit booking load error:", oError);
                MessageBox.error("Unable to load booking details for edit.");
            } finally {
                this.closeBusyDialog();
            }
        },

        // Returns true only when the active login belongs to this booking owner.
        _isBookingAccessAllowed: function (sOwnerUserID) {
            if (!sOwnerUserID) {
                return false;
            }
            var bLoggedIn = localStorage.getItem("isLoggedIn") === "true";
            var sLoggedInUserID = this._getLoggedInUserID();
            return bLoggedIn && sLoggedInUserID === sOwnerUserID;
        },

        // Safely decodes the currently logged-in UserID from localStorage.
        _getLoggedInUserID: function () {
            try {
                var sEncoded = localStorage.getItem("_aB39X");
                if (!sEncoded) {
                    return "";
                }
                return atob(sEncoded) || "";
            } catch (e) {
                return "";
            }
        },

        _applyVerifiedUserLogin: async function (user) {
            this.initializeLoginModel();

            // Keep Component.js unchanged: first invalidate the old shared login so
            // other tabs run the existing storage-listener logout, then write the
            // OTP-verified user as the single active session.
            localStorage.removeItem("isLoggedIn");
            localStorage.removeItem("_x9A1p");
            localStorage.removeItem("_k7LmQ");
            localStorage.removeItem("_aB39X");
            localStorage.removeItem("_mN72P");

            await new Promise(function (resolve) {
                setTimeout(resolve, 300);
            });

            localStorage.setItem("isLoggedIn", "true");
            localStorage.setItem("_x9A1p", user._x9A1p || "");
            localStorage.setItem("_k7LmQ", user._k7LmQ || "");
            localStorage.setItem("_aB39X", btoa(user.UserID || ""));
            localStorage.setItem("_mN72P", btoa(user.UserName || user.CustomerName || ""));

            var oUIModel = this.getOwnerComponent().getModel("UIModel");
            if (oUIModel) {
                oUIModel.setProperty("/isLoggedIn", true);
            }

            var oLoginModel = this.getOwnerComponent().getModel("LoginModel") || new JSONModel({});
            this.getOwnerComponent().setModel(oLoginModel, "LoginModel");
            sap.ui.getCore().setModel(oLoginModel, "LoginModel");
            oLoginModel.setData(Object.assign({}, oLoginModel.getData() || {}, {
                isLoggedIn: true,
                EmployeeID: user.UserID || "",
                UserID: user.UserID || "",
                Salutation: user.Salutation || "",
                EmployeeName: user.UserName || user.CustomerName || "",
                UserName: user.UserName || user.CustomerName || "",
                EmailID: user.EmailID || user.CustomerEmail || user.Email || "",
                Role: user.Role || "",
                BranchCode: user.BranchCode || "",
                STDCode: user.STDCode || "",
                MobileNo: user.MobileNo || user.Mobile || "",
                Gender: user.Gender || "",
                Country: user.Country || "",
                State: user.State || "",
                City: user.City || "",
                Address: user.Address || "",
                DateofBirth: user.DateOfBirth ? this.Formatter.DateFormat(user.DateOfBirth) : "",
                FileContent: user.FileContent || "",
                Photo: user.FileContent ? "data:image/png;base64," + user.FileContent : ""
            }));
        },

        /**
         * Override to merge member documents with existing API members in edit mode
         */
        _loadMemberDataInBackground: function () {
            // Prevent multiple simultaneous loads
            if (this._bMemberDataLoading) {
                return;
            }

            this._bMemberDataLoading = true;
            this._bMemberDataLoaded = false;

            const oHostelModel = this.getView().getModel("HostelModel");
            const sUserID = oHostelModel.getProperty("/UserID") || "";

            if (!sUserID) {
                console.warn("Cannot load member data: UserID not available");
                this._bMemberDataLoaded = true;
                this._bMemberDataLoading = false;
                return;
            }

            // Load member data in background with a small delay to prioritize UI rendering
            setTimeout(() => {
                this.ajaxReadWithJQuery("HM_MemberDocument", { UserID: sUserID })
                    .then(oResponse => {
                        if (oResponse && oResponse.data) {
                            const aMemberDocs = Array.isArray(oResponse.data) ? oResponse.data : [];
                            // Get existing MemberList from HostelModel (contains API members from HM_Customer)
                            const aExistingMembers = oHostelModel.getProperty("/MemberList") || [];

                            // Use lightweight merge for better performance
                            const aUpdatedMembers = this._lightweightMergeMemberDocuments(aExistingMembers, aMemberDocs);
                            oHostelModel.setProperty("/MemberList", aUpdatedMembers);
                        }
                        this._bMemberDataLoaded = true;
                        this._bMemberDataLoading = false;
                    })
                    .catch(err => {
                        console.warn("Failed to load member data in background:", err);
                        this._bMemberDataLoaded = true; // Still set to true to avoid blocking users
                        this._bMemberDataLoading = false;
                    });
            }, 100); // Small delay to let UI render first
        },

        _lightweightMergeMemberDocuments: function (aApiMembers, aMemberDocs) {
            if (!aMemberDocs.length) {
                return aApiMembers;
            }

            // Create a map for faster lookups
            const mMemberMap = {};
            aApiMembers.forEach((oMember, iIndex) => {
                const sKey = oMember.MemberID || `idx_${iIndex}`;
                mMemberMap[sKey] = oMember;
            });

            aMemberDocs.forEach(oDocMember => {
                const sKey = oDocMember.MemberID;
                if (sKey && mMemberMap[sKey]) {
                    // Quick merge of documents array
                    if (Array.isArray(oDocMember.Documents) && oDocMember.Documents.length > 0) {
                        mMemberMap[sKey].Documents = oDocMember.Documents;
                    }
                    // Copy only essential fields
                    const oExisting = mMemberMap[sKey];
                    if (!oExisting.DocumentType && oDocMember.DocumentType) oExisting.DocumentType = oDocMember.DocumentType;
                    if (!oExisting.DocumentName && oDocMember.DocumentName) oExisting.DocumentName = oDocMember.DocumentName;
                    if (!oExisting.FileName && oDocMember.FileName) oExisting.FileName = oDocMember.FileName;
                } else if (sKey) {
                    // New member - add to map
                    mMemberMap[sKey] = oDocMember;
                }
            });

            return Object.values(mMemberMap);
        },

        /**
         * Merge member documents into existing member list
         */
        _mergeMemberDocuments: function (aApiMembers, aMemberDocs) {
            if (!aMemberDocs.length) {
                return aApiMembers;
            }

            // Create a copy of API members
            const aMerged = JSON.parse(JSON.stringify(aApiMembers));

            aMemberDocs.forEach(oDocMember => {
                const oExisting = aMerged.find(am => am.MemberID === oDocMember.MemberID);
                if (oExisting) {
                    // Merge Documents array from HM_MemberDocument into the API member
                    if (Array.isArray(oDocMember.Documents) && oDocMember.Documents.length > 0) {
                        oExisting.Documents = oDocMember.Documents;
                    }
                    // Also copy top-level document fields if present on doc member but not on API member
                    if (!oExisting.DocumentType && oDocMember.DocumentType) { oExisting.DocumentType = oDocMember.DocumentType; }
                    if (!oExisting.DocumentName && oDocMember.DocumentName) { oExisting.DocumentName = oDocMember.DocumentName; }
                    if (!oExisting.FileName && oDocMember.FileName) { oExisting.FileName = oDocMember.FileName; }
                    if (!oExisting.File && oDocMember.File) { oExisting.File = oDocMember.File; }
                    if (!oExisting.Document && oDocMember.Document) { oExisting.Document = oDocMember.Document; }
                    if (!oExisting.FileType && oDocMember.FileType) { oExisting.FileType = oDocMember.FileType; }
                    if (!oExisting.DocumentID && oDocMember.DocumentID) { oExisting.DocumentID = oDocMember.DocumentID; }
                } else {
                    // If no matching API member, add the document member as a new entry
                    aMerged.push(oDocMember);
                }
            });

            return aMerged;
        },

        /**
         * Override to use PhotoUrl property for images instead of Base64 processing
         */
        _getFacilityImageSource: function (oFacility) {
            // First check if PhotoUrl is provided (backend should send direct image URLs)
            if (oFacility && oFacility.PhotoUrl) {
                return oFacility.PhotoUrl;
            }

            // Fallback to parent implementation (which uses Base64)
            return BookingController.prototype._getFacilityImageSource.call(this, oFacility);
        },

        /**
         * Override to avoid Base64 decoding for document previews
         * Use DocumentUrl if available, otherwise fallback to parent
         */
        _previewDocument: function (oDoc) {
            if (oDoc && (oDoc.DocumentUrl || oDoc.FileUrl || oDoc.Url)) {
                const sUrl = oDoc.DocumentUrl || oDoc.FileUrl || oDoc.Url;
                window.open(sUrl, '_blank');
                return;
            }
            this._openDocumentPreview(oDoc);
        },

        _simplifyFacilityItemsForEdit: function (aRawFacilities, oBooking) {
            // Lightweight facility processing - just extract essential info
            if (!Array.isArray(aRawFacilities) || aRawFacilities.length === 0) {
                return [];
            }

            var fnToNumber = function (vValue) {
                var fValue = parseFloat(String(vValue === null || vValue === undefined ? "" : vValue).replace(/,/g, "").trim());
                return isNaN(fValue) ? 0 : fValue;
            };

            var fnNormalizeKey = function (vValue) {
                return String(vValue || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
            };

            var fnGetFacilityKey = function (oItem) {
                // Always include UnitText in the key to prevent merging items with
                // different pricing units (Per Day vs Per Month) into a single entry.
                var sUnitText = fnNormalizeKey(oItem.UnitText || "Unit Price");
                var sSelectionMode = String(oItem.SelectionMode || "").trim().toUpperCase() || "SINGLE";

                // For PERSON and PERSON_QTY modes, each person gets their own FacilityID,
                // so we must NOT use FacilityID as the key — otherwise two people with the
                // same facility would create two separate cards instead of one card with a
                // person table. Group by name+mode+unitText so all person items aggregate.
                if (sSelectionMode === "PERSON" || sSelectionMode === "PERSON_QTY") {
                    var sFacilityName = fnNormalizeKey(oItem.FacilityName || oItem.Type || "");
                    return sFacilityName + "|" + sSelectionMode + "|" + sUnitText;
                }

                // For SINGLE/QTY modes, use FacilityID|UnitText to separate different
                // UnitText variants while keeping same-variant items together.
                var sFacilityID = String(oItem.FacilityID || oItem.ID || "").trim();
                if (sFacilityID) {
                    return sFacilityID + "|" + sUnitText;
                }
                var sFacilityName = fnNormalizeKey(oItem.FacilityName || oItem.Type || "");
                return sFacilityName + "|" + sSelectionMode + "|" + sUnitText;
            };

            var fnTrackPersonSelection = function (oAgg, oItem) {
                var sSelectionMode = oAgg.SelectionMode;
                var sMemberId = String(oItem.MemberID || "").trim();
                var sMemberName = String(oItem.MemberName || oItem.Name || "").trim();
                var sPersonKey = sMemberId || sMemberName;

                if ((sSelectionMode === "PERSON" || sSelectionMode === "PERSON_QTY") && sPersonKey && oAgg.SelectedPersonIds.indexOf(sPersonKey) < 0) {
                    oAgg.SelectedPersonIds.push(sPersonKey);
                }

                if (sSelectionMode !== "PERSON_QTY" || !sPersonKey) {
                    return;
                }

                var iQty = Math.max(parseInt(oItem.Quantity, 10) || 0, 0);
                var oExistingLine = oAgg.PersonQuantities.find(function (oLine) {
                    return String(oLine.personId || "").trim() === sPersonKey;
                });

                if (!oExistingLine) {
                    oExistingLine = {
                        personId: sPersonKey,
                        personName: sMemberName || sPersonKey,
                        selected: iQty > 0,
                        qty: 0
                    };
                    oAgg.PersonQuantities.push(oExistingLine);
                }

                oExistingLine.qty += iQty;
                oExistingLine.selected = oExistingLine.selected || iQty > 0;

                if (sMemberName) {
                    oExistingLine.personName = sMemberName;
                }
            };

            var mFacilityMap = {};

            aRawFacilities.forEach(function (oItem) {
                var sSelectionMode = String(oItem.SelectionMode || "").trim().toUpperCase() || "SINGLE";
                var sFacilityId = fnGetFacilityKey(oItem);
                var iRowQty = Math.max(parseInt(oItem.Quantity, 10) || 0, 0);

                if (!mFacilityMap[sFacilityId]) {
                    mFacilityMap[sFacilityId] = {
                        FacilityID: oItem.FacilityID || oItem.ID || "",
                        FacilityName: oItem.FacilityName || oItem.Type || "",
                        Type: oItem.Type || "",
                        SelectionMode: sSelectionMode,
                        UnitText: oItem.UnitText || "Unit Price",
                        Price: fnToNumber(oItem.BasicFacilityPrice || oItem.PricePerUnit || oItem.UnitAmount),
                        SelectedPrice: fnToNumber(oItem.BasicFacilityPrice || oItem.PricePerUnit || oItem.UnitAmount),
                        SelectedPriceType: oItem.UnitText || "Unit Price",
                        BasicFacilityPrice: fnToNumber(oItem.BasicFacilityPrice),
                        FacilityChargeType: oItem.FacilityChargeType || "",
                        Quantity: sSelectionMode === "QTY" || sSelectionMode === "PERSON_QTY"
                            ? iRowQty
                            : Math.max(parseInt(oItem.Quantity, 10) || 1, 1),
                        Currency: oItem.Currency || "",
                        Image: oItem.Image || "",
                        SavedTotalAmount: fnToNumber(oItem.FacilitiPrice || oItem.Price || oItem.TotalAmount || oItem.Amount),
                        SavedQuantity: sSelectionMode === "QTY" || sSelectionMode === "PERSON_QTY"
                            ? iRowQty
                            : Math.max(parseInt(oItem.Quantity, 10) || 1, 1),
                        // Per-item date/time for facility-specific pricing calculations
                        StartDate: oItem.StartDate || null,
                        EndDate: oItem.EndDate || null,
                        StartTime: oItem.StartTime || null,
                        EndTime: oItem.EndTime || null,
                        TotalHour: oItem.TotalHour || null,
                        RawFacilityItems: [Object.assign({}, oItem)],
                        SelectedPersonIds: [],
                        PersonQuantities: []
                    };
                } else {
                    // Aggregate data
                    var oAgg = mFacilityMap[sFacilityId];
                    oAgg.RawFacilityItems.push(Object.assign({}, oItem));
                    oAgg.SavedTotalAmount += fnToNumber(oItem.FacilitiPrice || oItem.Price || oItem.TotalAmount || oItem.Amount);
                    if (sSelectionMode === "QTY" || sSelectionMode === "PERSON_QTY") {
                        oAgg.Quantity += iRowQty;
                        oAgg.SavedQuantity += iRowQty;
                    }
                }

                fnTrackPersonSelection(mFacilityMap[sFacilityId], oItem);
            });

            return Object.keys(mFacilityMap).map(function (sKey) {
                return mFacilityMap[sKey];
            });
        },

        /**
         * Convert a value to a number safely. Falls back to 0 for invalid inputs.
         * Mirrors the parent _toNumber but is self-contained for the edit flow.
         */
        _toNumber: function (vValue) {
            var fValue = parseFloat(String(vValue === undefined || vValue === null ? "" : vValue).replace(/,/g, "").trim());
            return isNaN(fValue) ? 0 : fValue;
        },

        /**
         * Condition 1 check: facility dates match original booking dates and no time values.
         * These facilities should use current booking dates so duration changes propagate.
         * Condition 2: facility has admin-set dates/times different from booking — keeps its own.
         */
        _isBookingDateDependentFacility: function (oFacility) {
            if (!oFacility) { return false; }

            var fnNormDate = function (vDate) {
                var oParsed = this._parseDate(vDate);
                if (!oParsed || isNaN(oParsed.getTime())) { return ""; }
                return oParsed.getFullYear() + "-" +
                    String(oParsed.getMonth() + 1).padStart(2, "0") + "-" +
                    String(oParsed.getDate()).padStart(2, "0");
            }.bind(this);

            var sOrigStart = fnNormDate(this._sOriginalBookingStartDate);
            var sOrigEnd = fnNormDate(this._sOriginalBookingEndDate);

            if (!sOrigStart || !sOrigEnd) { return true; }

            var aItems = Array.isArray(oFacility.RawFacilityItems) && oFacility.RawFacilityItems.length > 0
                ? oFacility.RawFacilityItems
                : [oFacility];

            return aItems.every(function (oItem) {
                var sFacStart = fnNormDate(oItem.StartDate || oFacility.StartDate);
                var sFacEnd = fnNormDate(oItem.EndDate || oFacility.EndDate);
                var sStartTime = String(oItem.StartTime || "").trim();
                var sEndTime = String(oItem.EndTime || "").trim();

                var bDatesMatch = (!sFacStart && !sFacEnd) ||
                    (sFacStart === sOrigStart && sFacEnd === sOrigEnd);
                var bNoTimeValues = !sStartTime && !sEndTime;

                return bDatesMatch && bNoTimeValues;
            }.bind(this));
        },

        /**
         * Count exclusive days between two dates.
         * 2026-05-13 to 2026-05-17 = 4 days (exclusive end).
         */
        _getDayCount: function (oStartDate, oEndDate) {
            var oStart = this._parseDate(oStartDate);
            var oEnd = this._parseDate(oEndDate);
            if (!oStart || !oEnd || oEnd <= oStart) { return 0; }
            return Math.max(Math.floor((oEnd.getTime() - oStart.getTime()) / 86400000), 0);
        },

        /**
         * Count months spanned between two dates (inclusive partial month = 1).
         */
        _getMonthCount: function (oStartDate, oEndDate) {
            var oStart = this._parseDate(oStartDate);
            var oEnd = this._parseDate(oEndDate);
            if (!oStart || !oEnd || oEnd <= oStart) { return 0; }
            var iMonths = (oEnd.getFullYear() - oStart.getFullYear()) * 12 + (oEnd.getMonth() - oStart.getMonth());
            if (oEnd.getDate() > oStart.getDate()) { iMonths += 1; }
            return Math.max(iMonths, 0);
        },

        /**
         * Count years spanned between two dates (inclusive partial year = 1).
         */
        _getYearCount: function (oStartDate, oEndDate) {
            var oStart = this._parseDate(oStartDate);
            var oEnd = this._parseDate(oEndDate);
            if (!oStart || !oEnd || oEnd <= oStart) { return 0; }
            var iYears = oEnd.getFullYear() - oStart.getFullYear();
            var iStartMonth = oStart.getMonth();
            var iEndMonth = oEnd.getMonth();
            if (iEndMonth > iStartMonth || (iEndMonth === iStartMonth && oEnd.getDate() > oStart.getDate())) {
                iYears += 1;
            }
            return Math.max(iYears, 0);
        },

        /**
         * Count hours between two times (HH:MM format) or two full Date objects.
         * Falls back to TotalHour if present.
         */
        _getHourCount: function (oStartDate, oEndDate, sStartTime, sEndTime, fTotalHour) {
            // If TotalHour is explicitly provided, use it
            if (fTotalHour !== undefined && fTotalHour !== null && parseFloat(fTotalHour) > 0) {
                return parseFloat(fTotalHour);
            }
            // Try time strings
            if (sStartTime && sEndTime) {
                var fnParseTime = function (sTime) {
                    var aParts = String(sTime).trim().split(":");
                    return parseInt(aParts[0], 10) * 60 + parseInt(aParts[1] || "0", 10);
                };
                var iStartMins = fnParseTime(sStartTime);
                var iEndMins = fnParseTime(sEndTime);
                if (!isNaN(iStartMins) && !isNaN(iEndMins)) {
                    var iDiffMins = iEndMins > iStartMins ? iEndMins - iStartMins : (24 * 60 - iStartMins + iEndMins);
                    return Math.max(iDiffMins / 60, 0);
                }
            }
            // Try full date objects
            var oStart = this._parseDate(oStartDate);
            var oEnd = this._parseDate(oEndDate);
            if (oStart && oEnd && oEnd > oStart) {
                return Math.max((oEnd.getTime() - oStart.getTime()) / 3600000, 0);
            }
            return 0;
        },

        /**
         * Compute a quantity factor from Quantity field.
         * Returns Quantity as a number, defaulting to 1.
         */
        _getQuantityFactor: function (iQuantity) {
            var iQty = parseInt(iQuantity, 10);
            return isNaN(iQty) || iQty <= 0 ? 1 : iQty;
        },

        /**
         * Calculate facility total based on UnitText pricing rules:
         *   Unit Price   → BasicFacilityPrice × Quantity
         *   Package Price → Entire Booking: BasicFacilityPrice × Quantity
         *                   Daily: BasicFacilityPrice × Quantity × DayCount
         *   Per Day      → BasicFacilityPrice × DayCount × Quantity
         *   Per Hour     → BasicFacilityPrice × HourCount × Quantity
         *   Per Month    → BasicFacilityPrice × MonthCount × Quantity
         *   Per Year     → BasicFacilityPrice × YearCount × Quantity
         */
        _calculateFacilityTotal: function (oFacilityItem) {
            var fBasicPrice = this._toNumber(oFacilityItem.BasicFacilityPrice);
            var sUnitText = String(oFacilityItem.UnitText || "Unit Price").trim();
            var iQuantity = this._getQuantityFactor(oFacilityItem.Quantity);
            var sChargeType = String(oFacilityItem.FacilityChargeType || "").trim().toUpperCase();

            var oStartDate = this._parseDate(oFacilityItem.StartDate);
            var oEndDate = this._parseDate(oFacilityItem.EndDate);
            var iDayCount = this._getDayCount(oStartDate, oEndDate);
            var iMonthCount = this._getMonthCount(oStartDate, oEndDate);
            var iYearCount = this._getYearCount(oStartDate, oEndDate);
            var iHourCount = this._getHourCount(oFacilityItem.StartDate, oFacilityItem.EndDate, oFacilityItem.StartTime, oFacilityItem.EndTime, oFacilityItem.TotalHour);

            var sUnitKey = sUnitText.toUpperCase();

            if (sUnitKey === "UNIT PRICE" || sUnitKey === "UNIT") {
                return Number((fBasicPrice * iQuantity).toFixed(2));
            }

            if (sUnitKey === "PACKAGE PRICE" || sUnitKey === "PACKAGE") {
                if (sChargeType === "DAILY") {
                    return Number((fBasicPrice * iQuantity * Math.max(iDayCount, 1)).toFixed(2));
                }
                return Number((fBasicPrice * iQuantity).toFixed(2));
            }

            if (sUnitKey === "PER DAY" || sUnitKey === "PERDAY") {
                return Number((fBasicPrice * Math.max(iDayCount, 1) * iQuantity).toFixed(2));
            }

            if (sUnitKey === "PER HOUR" || sUnitKey === "PERHOUR") {
                // Per Hour pricing: BasicFacilityPrice × DayCount × HourCount × Quantity
                // Hourly rates apply each day over the booking duration
                return Number((fBasicPrice * Math.max(iDayCount, 1) * Math.max(iHourCount, 1) * iQuantity).toFixed(2));
            }

            if (sUnitKey === "PER MONTH" || sUnitKey === "PERMONTH") {
                return Number((fBasicPrice * Math.max(iMonthCount, 1) * iQuantity).toFixed(2));
            }

            if (sUnitKey === "PER YEAR" || sUnitKey === "PERYEAR") {
                return Number((fBasicPrice * Math.max(iYearCount, 1) * iQuantity).toFixed(2));
            }

            // Default: treat as Unit Price
            return Number((fBasicPrice * iQuantity).toFixed(2));
        },

        /**
         * Build a period-based breakdown text for facility display.
         * Matches Booking controller format: "Qty (3) x 7 Per Day" or "7 Per Day" (SINGLE).
         * @param {Object} oCalcItem - Calc item with StartDate, EndDate, UnitText, etc.
         * @param {number} iQty - Quantity (1 for SINGLE, actual qty for QTY)
         * @returns {string} Breakdown text string
         */
        _buildFacilityPeriodBreakdown: function (oCalcItem, iQty) {
            var sPriceType = oCalcItem.UnitText || "Unit Price";
            var sUnitKey = sPriceType.toUpperCase().replace(/[^A-Z0-9]/g, "");
            var oCalcStart = this._parseDate(oCalcItem.StartDate);
            var oCalcEnd = this._parseDate(oCalcItem.EndDate);
            var sPeriodPart = "";

            if (sUnitKey === "PERDAY") {
                sPeriodPart = Math.max(this._getDayCount(oCalcStart, oCalcEnd), 1) + " Per Day";
            } else if (sUnitKey === "PERMONTH") {
                sPeriodPart = Math.max(this._getMonthCount(oCalcStart, oCalcEnd), 1) + " Per Month";
            } else if (sUnitKey === "PERYEAR") {
                sPeriodPart = Math.max(this._getYearCount(oCalcStart, oCalcEnd), 1) + " Per Year";
            } else if (sUnitKey === "PERHOUR") {
                var iDays = Math.max(this._getDayCount(oCalcStart, oCalcEnd), 1);
                var iHours = Math.max(this._getHourCount(oCalcItem.StartDate, oCalcItem.EndDate, oCalcItem.StartTime, oCalcItem.EndTime, oCalcItem.TotalHour), 1);
                sPeriodPart = iDays + " day(s) x " + iHours + " hr(s)";
            } else if (sUnitKey === "PACKAGEPRICE" || sUnitKey === "PACKAGE") {
                var sChargeType = String(oCalcItem.FacilityChargeType || "").toUpperCase();
                if (sChargeType === "DAILY") {
                    sPeriodPart = Math.max(this._getDayCount(oCalcStart, oCalcEnd), 1) + " day(s)";
                }
            }

            if (iQty === 1) {
                return sPeriodPart || "Qty (1)";
            }
            return "Qty (" + iQty + ")" + (sPeriodPart ? " x " + sPeriodPart : "");
        },

        /**
         * Calculate per-person totals for PERSON and PERSON_QTY modes.
         * Each person's RawFacilityItem contains their own StartDate/EndDate,
         * so we compute each person's total individually and sum them.
         * Returns { total: Number, personBreakdown: Array }.
         */
        _calculatePerPersonTotal: function (oFacility, aOccupants) {
            var sSelectionMode = oFacility.SelectionMode || this._getFacilitySelectionMode(oFacility);
            var aRawItems = Array.isArray(oFacility.RawFacilityItems) ? oFacility.RawFacilityItems : [];
            var aSelectedPersonIds = Array.isArray(oFacility.SelectedPersonIds) ? oFacility.SelectedPersonIds : [];
            var aPersonQuantities = Array.isArray(oFacility.PersonQuantities) ? oFacility.PersonQuantities : [];

            // Condition 1 check: use current booking dates when facility follows booking dates
            var bUseBookingDates = this._isBookingDateDependentFacility(oFacility);
            var oHostelModel = this.getView().getModel("HostelModel");
            var sBookingStart = bUseBookingDates && oHostelModel ? oHostelModel.getProperty("/StartDate") : null;
            var sBookingEnd = bUseBookingDates && oHostelModel ? oHostelModel.getProperty("/EndDate") : null;

            var fnGetPersonName = function (sPersonId) {
                var oFound = (aOccupants || []).find(function (oPerson) {
                    return oPerson.id === sPersonId;
                });
                return oFound ? oFound.name : sPersonId;
            };

            var fTotal = 0;
            var aPersonBreakdown = [];

            if (sSelectionMode === "PERSON") {
                var fPrice = this._getFirstAvailableNumber(oFacility.SelectedPrice, oFacility.CurrentPrice, oFacility.BasicFacilityPrice);
                var sPriceType = oFacility.SelectedPriceType || oFacility.CurrentPriceType || "Unit Price";

                aSelectedPersonIds.forEach(function (sPersonId) {
                    var sPersonName = fnGetPersonName(sPersonId);
                    // Find the occupant for this personId to get aliases for matching
                    var oOccupant = (aOccupants || []).find(function (oPerson) {
                        return oPerson.id === sPersonId;
                    });
                    // Find raw items for this person using alias-based matching
                    var aPersonItems = aRawItems.filter(function (oItem) {
                        var sItemMemberId = String(oItem.MemberID || "").trim();
                        var sItemMemberName = String(oItem.MemberName || oItem.Name || "").trim();
                        // Direct match first
                        if (sItemMemberId === sPersonId || sItemMemberName === sPersonId) {
                            return true;
                        }
                        // Alias-based match using occupant resolution
                        if (oOccupant && oOccupant.aliases) {
                            return oOccupant.aliases.some(function (sAlias) {
                                var sNormAlias = this._normalizeEditPersonKey(sAlias);
                                var sNormMemberName = this._normalizeEditPersonKey(sItemMemberName);
                                var sNormMemberId = this._normalizeEditPersonKey(sItemMemberId);
                                return sNormAlias && (
                                    sNormAlias === sNormMemberId ||
                                    sNormAlias === sNormMemberName ||
                                    sNormAlias.indexOf(sNormMemberName) >= 0 ||
                                    sNormMemberName.indexOf(sNormAlias) >= 0
                                );
                            }.bind(this));
                        }
                        return false;
                    }.bind(this));

                    // Build calc item with this person's specific dates
                    var oPersonCalcItem = {
                        BasicFacilityPrice: fPrice,
                        UnitText: sPriceType,
                        Quantity: 1,
                        FacilityChargeType: oFacility.FacilityChargeType || ""
                    };

                    if (bUseBookingDates) {
                        oPersonCalcItem.StartDate = sBookingStart;
                        oPersonCalcItem.EndDate = sBookingEnd;
                        oPersonCalcItem.StartTime = null;
                        oPersonCalcItem.EndTime = null;
                        oPersonCalcItem.TotalHour = (aPersonItems.length > 0 ? aPersonItems[0].TotalHour : null) || oFacility.TotalHour || null;
                    } else if (aPersonItems.length > 0) {
                        var oPersonRaw = aPersonItems[0];
                        oPersonCalcItem.StartDate = oPersonRaw.StartDate || oFacility.StartDate || null;
                        oPersonCalcItem.EndDate = oPersonRaw.EndDate || oFacility.EndDate || null;
                        oPersonCalcItem.StartTime = oPersonRaw.StartTime || oFacility.StartTime || null;
                        oPersonCalcItem.EndTime = oPersonRaw.EndTime || oFacility.EndTime || null;
                        oPersonCalcItem.TotalHour = oPersonRaw.TotalHour || oFacility.TotalHour || null;
                    } else {
                        oPersonCalcItem.StartDate = oFacility.StartDate || null;
                        oPersonCalcItem.EndDate = oFacility.EndDate || null;
                        oPersonCalcItem.StartTime = oFacility.StartTime || null;
                        oPersonCalcItem.EndTime = oFacility.EndTime || null;
                        oPersonCalcItem.TotalHour = oFacility.TotalHour || null;
                    }

                    var fPersonTotal = this._calculateFacilityTotal(oPersonCalcItem);
                    fTotal += fPersonTotal;

                    var iDayCount = this._getDayCount(oPersonCalcItem.StartDate, oPersonCalcItem.EndDate);
                    var iMonthCount = this._getMonthCount(oPersonCalcItem.StartDate, oPersonCalcItem.EndDate);
                    var iYearCount = this._getYearCount(oPersonCalcItem.StartDate, oPersonCalcItem.EndDate);
                    var iHourCount = this._getHourCount(
                        oPersonCalcItem.StartDate, oPersonCalcItem.EndDate,
                        oPersonCalcItem.StartTime, oPersonCalcItem.EndTime,
                        oPersonCalcItem.TotalHour
                    );

                    aPersonBreakdown.push({
                        personId: sPersonId,
                        personName: sPersonName,
                        price: fPrice,
                        priceType: sPriceType,
                        startDate: oPersonCalcItem.StartDate,
                        endDate: oPersonCalcItem.EndDate,
                        startTime: oPersonCalcItem.StartTime,
                        endTime: oPersonCalcItem.EndTime,
                        totalHour: oPersonCalcItem.TotalHour,
                        dayCount: iDayCount,
                        monthCount: iMonthCount,
                        yearCount: iYearCount,
                        hourCount: iHourCount,
                        personTotal: fPersonTotal
                    });
                }.bind(this));

            } else if (sSelectionMode === "PERSON_QTY") {
                var fPackagePrice = this._getFirstAvailableNumber(
                    oFacility.MinimumPrice,
                    oFacility.SelectedPrice,
                    oFacility.CurrentPrice
                );
                var sFacilityChargeType = this._getFacilityChargeType(oFacility);

                var aValidLines = aPersonQuantities.filter(function (oLine) {
                    return (parseInt(oLine.qty, 10) || 0) > 0;
                });

                aValidLines.forEach(function (oLine) {
                    var sPersonId = oLine.personId;
                    var sPersonName = oLine.personName || fnGetPersonName(sPersonId);
                    var iQty = Math.max(parseInt(oLine.qty, 10) || 0, 1);

                    // Find the occupant for this personId to get aliases for matching
                    var oOccupant = (aOccupants || []).find(function (oPerson) {
                        return oPerson.id === sPersonId;
                    });
                    // Find raw items for this person using alias-based matching
                    var aPersonItems = aRawItems.filter(function (oItem) {
                        var sItemMemberId = String(oItem.MemberID || "").trim();
                        var sItemMemberName = String(oItem.MemberName || oItem.Name || "").trim();
                        // Direct match first
                        if (sItemMemberId === sPersonId || sItemMemberName === sPersonId) {
                            return true;
                        }
                        // Alias-based match using occupant resolution
                        if (oOccupant && oOccupant.aliases) {
                            return oOccupant.aliases.some(function (sAlias) {
                                var sNormAlias = this._normalizeEditPersonKey(sAlias);
                                var sNormMemberName = this._normalizeEditPersonKey(sItemMemberName);
                                var sNormMemberId = this._normalizeEditPersonKey(sItemMemberId);
                                return sNormAlias && (
                                    sNormAlias === sNormMemberId ||
                                    sNormAlias === sNormMemberName ||
                                    sNormAlias.indexOf(sNormMemberName) >= 0 ||
                                    sNormMemberName.indexOf(sNormAlias) >= 0
                                );
                            }.bind(this));
                        }
                        return false;
                    }.bind(this));

                    var sPersonStart, sPersonEnd;
                    if (bUseBookingDates) {
                        sPersonStart = sBookingStart;
                        sPersonEnd = sBookingEnd;
                    } else if (aPersonItems.length > 0) {
                        var oPersonRaw = aPersonItems[0];
                        sPersonStart = oPersonRaw.StartDate || null;
                        sPersonEnd = oPersonRaw.EndDate || null;
                    } else {
                        sPersonStart = oFacility.StartDate || null;
                        sPersonEnd = oFacility.EndDate || null;
                    }

                    var iDayCount = this._getDayCount(sPersonStart, sPersonEnd);
                    var fPersonTotal;

                    if (sFacilityChargeType === "DAILY") {
                        // DAILY: BasicFacilityPrice already includes QTY, so only multiply by days
                        fPersonTotal = fPackagePrice * Math.max(iDayCount, 1);
                    } else if (sFacilityChargeType === "Entire Booking") {
                        // Entire Booking: BasicFacilityPrice already includes QTY, flat total
                        fPersonTotal = fPackagePrice;
                    } else {
                        fPersonTotal = fPackagePrice * iQty;
                    }

                    fTotal += fPersonTotal;

                    aPersonBreakdown.push({
                        personId: sPersonId,
                        personName: sPersonName,
                        packagePrice: fPackagePrice,
                        quantity: iQty,
                        chargeType: sFacilityChargeType,
                        startDate: sPersonStart,
                        endDate: sPersonEnd,
                        dayCount: iDayCount,
                        personTotal: fPersonTotal
                    });
                }.bind(this));
            }

            return {
                total: Number(fTotal.toFixed(2)),
                personBreakdown: aPersonBreakdown
            };
        },

        _normalizeBookingEditData: function (oResponse, sBookingID, oBranchData, oRoomData, oPricingData, aMemberDocs) {
            var oCustomer = oResponse && oResponse.Customers || oResponse && oResponse.value && oResponse.value[0] || {};
            var oBooking = (Array.isArray(oCustomer.Bookings) ? oCustomer.Bookings[0] : oCustomer.Bookings) || {};
            oBranchData = oBranchData || {};
            oRoomData = oRoomData || {};
            oPricingData = oPricingData || {};
            aMemberDocs = aMemberDocs || [];

            // Simplified facility processing - defer complex processing until needed
            var aRawFacilities = oCustomer.FacilityItems || [];
            var aParsedFacilities = this._simplifyFacilityItemsForEdit(aRawFacilities, oBooking);

            // Determine ExtraBed from room data or from selected facilities
            var iExtraBed = oRoomData.ExtraBed || oBooking.ExtraBed || 0;
            if (!iExtraBed) {
                aParsedFacilities.forEach(function (oFac) {
                    if ((oFac.Type || oFac.FacilityName || "").toLowerCase().indexOf("extra bed") >= 0) {
                        iExtraBed = 1;
                    }
                });
            }

            // Derive duration in the same unit used by the selected plan.
            // The shared booking flow interprets SelectedMonths as:
            // - month count for "Per Month"
            // - year count for "Per Year"
            // If we always store raw month difference here, yearly edit bookings
            // get expanded again by the parent logic (for example 12 -> 12 years).
            var iSelectedMonths = 1;
            var oStart = this._parseDate(oBooking.StartDate);
            var oEnd = this._parseDate(oBooking.EndDate);
            var sSelectedPriceType = oBooking.PaymentType || "";
            if (oStart && oEnd) {
                var iMonths = (oEnd.getFullYear() - oStart.getFullYear()) * 12 + (oEnd.getMonth() - oStart.getMonth());

                if (oEnd.getDate() > oStart.getDate()) {
                    iMonths += 1;
                }

                if (sSelectedPriceType === "Per Year") {
                    iSelectedMonths = Math.max(Math.round(iMonths / 12), 1);
                } else if (sSelectedPriceType === "Per Month") {
                    iSelectedMonths = Math.max(iMonths, 1);
                } else {
                    iSelectedMonths = 1;
                }
            }

            // Build NoOfPersonsList from capacity (like onConfirmBooking does)
            var iCapacity = parseInt(oRoomData.NoOfPerson || oBooking.Capacity || oBooking.NoOfPersons || 1, 10) || 1;
            var aNoOfPersonsList = [];
            for (var i = 1; i <= iCapacity; i++) {
                aNoOfPersonsList.push({ key: String(i), text: String(i) });
            }

            // Merge member lists: API members + member documents (like onConfirmBooking)
            // HM_MemberDocument entries carry Documents[] with DocumentType/FileName/File etc.
            // HM_Customer members lack Documents — so we must merge docs INTO the API members
            // instead of discarding the HM_MemberDocument entries that share the same MemberID.
            var aApiMembers = (oCustomer.Members || oCustomer.MemberList || []).slice();
            aMemberDocs.forEach(function (oDocMember) {
                var oExisting = aApiMembers.find(function (am) { return am.MemberID === oDocMember.MemberID; });
                if (oExisting) {
                    // Merge Documents array from HM_MemberDocument into the API member
                    if (Array.isArray(oDocMember.Documents) && oDocMember.Documents.length > 0) {
                        oExisting.Documents = oDocMember.Documents;
                    }
                    // Also copy top-level document fields if present on doc member but not on API member
                    if (!oExisting.DocumentType && oDocMember.DocumentType) { oExisting.DocumentType = oDocMember.DocumentType; }
                    if (!oExisting.DocumentName && oDocMember.DocumentName) { oExisting.DocumentName = oDocMember.DocumentName; }
                    if (!oExisting.FileName && oDocMember.FileName) { oExisting.FileName = oDocMember.FileName; }
                    if (!oExisting.File && oDocMember.File) { oExisting.File = oDocMember.File; }
                    if (!oExisting.Document && oDocMember.Document) { oExisting.Document = oDocMember.Document; }
                    if (!oExisting.FileType && oDocMember.FileType) { oExisting.FileType = oDocMember.FileType; }
                    if (!oExisting.DocumentID && oDocMember.DocumentID) { oExisting.DocumentID = oDocMember.DocumentID; }
                } else {
                    // New member not in API list — add it
                    aApiMembers.push(oDocMember);
                }
            });
            var aMemberList = aApiMembers;

            // Determine FinalPrice based on selected plan (like onConfirmBooking sets SelectedPriceValue)
            var fFinalPrice = 0;
            if (sSelectedPriceType === "Per Day") {
                fFinalPrice = oPricingData.Price || oBooking.Price || oBooking.RoomPrice || 0;
            } else if (sSelectedPriceType === "Per Month") {
                fFinalPrice = oPricingData.MonthPrice || oBooking.MonthPrice || 0;
            } else if (sSelectedPriceType === "Per Year") {
                fFinalPrice = oPricingData.YearPrice || oBooking.YearPrice || 0;
            }

            return {
                // Booking identifiers
                BookingID: sBookingID || oBooking.BookingID || "",
                UserID: oBooking.UserID || oCustomer.UserID || "",
                MemberID: oBooking.MemberID || oCustomer.MemberID || "",
                BookingDate: oBooking.BookingDate || new Date().toISOString(),
                RoomNo: oBooking.RoomNo || "",
                BedType: oBooking.BedType || "",
                ACType: oBooking.ACType || "",
                Status: oBooking.Status || "",

                // Property details (from branch + room data, like onConfirmBooking)
                PropertyType: oBranchData.PropertyType || oBooking.PropertyType || "",
                PropertyName: oBranchData.Name || oBooking.PropertyName || "",
                PropertySTD: oBranchData.STD || oBooking.PropertySTD || "",
                PropertyMobileNo: oBranchData.Contact || oBooking.PropertyMobileNo || "",
                PropertyEmail: oBranchData.EmailID || oBooking.PropertyEmail || "",
                Address: oBranchData.Address || oBooking.Address || "",
                Area: oBranchData.Name || "",
                Description: oRoomData.Description || oBooking.Description || "",
                Country: oBranchData.Country || oBooking.Country || "",
                AvailbleBeds: parseInt(oRoomData.NoOfPerson || iCapacity, 10) || iCapacity,

                // Branch details
                BranchCode: oBooking.BranchCode || "",
                CheckInTime: oBranchData.CheckinTime || oBooking.CheckInTime || "",
                CheckOutTime: oBranchData.CheckoutTime || oBooking.CheckOutTime || "",
                GSTType: oBranchData.Type || oBooking.GSTType || "",
                GSTValue: oBranchData.Value || oBooking.GSTValue || 0,
                GSTIN: oBranchData.GSTIN || oBooking.GSTIN || "",
                ExtraBed: iExtraBed,
                AvailableDate: oBooking.AvailableDate || "",

                // Pricing (from HM_Rooms via BookingBedTypeRoomReadCall, like viewDetails/onConfirmBooking)
                Price: oPricingData.Price || oBooking.Price || oBooking.RoomPrice || 0,
                MonthPrice: oPricingData.MonthPrice || oBooking.MonthPrice || 0,
                YearPrice: oPricingData.YearPrice || oBooking.YearPrice || 0,
                Currency: oPricingData.Currency || oBooking.Currency || oRoomData.Currency || "INR",
                Deposit: oPricingData.Deposit || oRoomData.Deposit || oBooking.Deposit || "",
                DepositCurrency: oPricingData.DepositCurrency || oRoomData.DepositCurrency || oBooking.DepositCurrency || "",
                FinalPrice: fFinalPrice,

                // Selected plan & dates
                SelectedPriceType: sSelectedPriceType,
                StartDate: this.Formatter && this.Formatter.formatDate
                    ? this.Formatter.formatDate(oBooking.StartDate)
                    : oBooking.StartDate,
                EndDate: this.Formatter && this.Formatter.formatDate
                    ? this.Formatter.formatDate(oBooking.EndDate)
                    : oBooking.EndDate,
                SelectedPerson: String(oBooking.NoOfPersons || "1"),
                SelectedMonths: String(iSelectedMonths),

                // Computed pricing
                GrandTotal: oBooking.RentPrice || 0,
                RoomPrice: oBooking.RoomPrice || 0,
                Capacity: iCapacity,
                NoOfPersonsList: aNoOfPersonsList,

                // GST / Business travel
                CustomerGSTIN: oBooking.CustomerGSTIN || "",
                CompanyName: oBooking.CustCompanyName || "",
                CompanyAddress: oBooking.CustCompanyAddress || "",
                IsBusinessTravel: !!oBooking.CustomerGSTIN,
                PropertyGSTIN: oBranchData.GSTIN || oBooking.GSTIN || "",

                // Discounts / Coupons
                AppliedDiscount: oBooking.Discount || 0,
                AppliedCouponCode: oBooking.CouponCode || "",
                CouponCode: oBooking.CouponCode || "",
                AppliedCouponData: null,

                // Members & Facilities
                MemberList: aMemberList,
                FamilyMembers: (function () {
                    var aFamily = (oCustomer.FamilyMembers || oCustomer.Members || aMemberList || []).slice();
                    // The booking's MemberID field is a comma-separated string like "00006_01,00006,00006_02"
                    // The FIRST value is always the primary occupant (0th index).
                    // Sort FamilyMembers to match that order, then set IsPrimary on the 0th entry.
                    var sMemberIDList = oBooking.MemberID || "";
                    if (sMemberIDList) {
                        var aOrderedIDs = sMemberIDList.split(",").map(function (s) { return s.trim(); });
                        aFamily.sort(function (a, b) {
                            var iA = aOrderedIDs.indexOf(a.MemberID);
                            var iB = aOrderedIDs.indexOf(b.MemberID);
                            // Members not found in the ordered list go to the end
                            if (iA < 0) { iA = aOrderedIDs.length; }
                            if (iB < 0) { iB = aOrderedIDs.length; }
                            return iA - iB;
                        });
                    }
                    aFamily.forEach(function (oMember, iIndex) {
                        oMember.IsPrimary = (iIndex === 0);
                    });
                    return aFamily;
                })(),
                AllSelectedFacilities: aParsedFacilities
            };
        },

        _getEditPaymentPaidAmount: function (aPayments) {
            return (Array.isArray(aPayments) ? aPayments : []).reduce(function (fSum, oPayment) {
                return fSum + (parseFloat(oPayment && oPayment.Amount) || 0);
            }, 0);
        },

        _readEditPaymentsByBookingId: async function (sBookingID) {
            if (!sBookingID) {
                return [];
            }

            try {
                var oResponse = await this.ajaxReadWithJQuery("HM_Payment", {
                    BookingID: sBookingID
                });

                if (Array.isArray(oResponse && oResponse.commentData)) {
                    return oResponse.commentData;
                }

                if (Array.isArray(oResponse && oResponse.data)) {
                    return oResponse.data;
                }

                if (Array.isArray(oResponse && oResponse.value)) {
                    return oResponse.value;
                }
            } catch (oError) {
                return [];
            }

            return [];
        },

        _buildBookingItemsPayload: function () {
            var aBooking = BookingController.prototype._buildBookingItemsPayload.call(this);
            var oHostelModel = this.getView().getModel("HostelModel");
            var oLoginModel = sap.ui.getCore().getModel("LoginModel");
            var oLoginData = oLoginModel && oLoginModel.getData ? oLoginModel.getData() || {} : {};
            var sOriginalMemberID = String(oHostelModel.getProperty("/MemberID") || "").trim();
            var sOriginalUserID = String(
                oHostelModel.getProperty("/UserID") ||
                oLoginData.UserID ||
                oLoginData.EmployeeID ||
                ""
            ).trim();

            aBooking[0].BookingID = oHostelModel.getProperty("/BookingID");
            aBooking[0].UserID = sOriginalUserID;
            aBooking[0].MemberID = String(aBooking[0].MemberID || sOriginalMemberID || "").trim();
            // Remove Status field to prevent updating status
            delete aBooking[0].Status;

            return aBooking;
        },

        _syncEditRefundInfo: function (fPaymentPaidAmount, fGrandTotal, fExplicitRefundAmount) {
            var oHostelModel = this.getView().getModel("HostelModel");
            var bHasExistingPayments = !!oHostelModel.getProperty("/HasExistingPayments");
            var fPaidAmount = this._toNumber(fPaymentPaidAmount);
            var fCurrentGrandTotal = this._toNumber(fGrandTotal);
            var fRefundAmount = 0;

            if (fExplicitRefundAmount !== undefined && fExplicitRefundAmount !== null) {
                // Use explicit refund amount when provided
                fRefundAmount = Number(Math.max(this._toNumber(fExplicitRefundAmount), 0).toFixed(2));
            } else {
                // Calculate refund based on paid amount vs current total
                fRefundAmount = bHasExistingPayments ? Number(Math.max(fPaidAmount - fCurrentGrandTotal, 0).toFixed(2)) : 0;
            }

            oHostelModel.setProperty("/PaymentPaidAmount", fPaidAmount);
            oHostelModel.setProperty("/RefundAmount", fRefundAmount);
            oHostelModel.setProperty("/ShowRefundMessage", fRefundAmount > 0);
            oHostelModel.setProperty(
                "/RefundMessage",
                fRefundAmount > 0
                    ? "A refund of " + fRefundAmount.toFixed(2) +
                    " " + (oHostelModel.getProperty("/Currency") || "INR") +
                    " is due. This amount will be refunded during check-out."
                    : ""
            );
        },

        _recalculateSummary: function () {
            BookingController.prototype._recalculateSummary.call(this);

            var oHostelModel = this.getView().getModel("HostelModel");
            if (!oHostelModel) {
                return;
            }

            this._syncEditRefundInfo(
                oHostelModel.getProperty("/PaymentPaidAmount"),
                oHostelModel.getProperty("/GrandTotal")
            );
        },

        _getSelectedMemberIDs: function () {
            var oHostelModel = this.getView().getModel("HostelModel");
            var oBookingView = this.getView().getModel("BookingView");
            var aFamilyMembers = oBookingView && Array.isArray(oBookingView.getProperty("/FamilyMembers"))
                ? oBookingView.getProperty("/FamilyMembers")
                : [];
            var sUserID = String(oHostelModel.getProperty("/UserID") || "").trim();

            if (!sUserID) {
                return "";
            }

            var aSelectedMembers = aFamilyMembers.filter(function (oMember) {
                return oMember && oMember.Selected === true;
            });
            var oPrimaryMember = aSelectedMembers.find(function (oMember) {
                return oMember.IsPrimary === true;
            }) || aSelectedMembers[0] || null;
            var aOrderedMembers = [];
            var aMemberIDs = [];

            var fnIsSelfMember = function (oMember) {
                var sRelation = String(oMember && oMember.Relation || "").trim().toLowerCase();
                var sId = String(oMember && oMember.id || "").trim().toUpperCase();
                return sRelation === "self" || sId === "SELF";
            };
            var fnResolveMemberID = function (oMember) {
                if (!oMember) {
                    return "";
                }

                if (fnIsSelfMember(oMember)) {
                    return sUserID;
                }

                return String(oMember.MemberID || oMember.ID || oMember.id || "").trim();
            };

            if (oPrimaryMember) {
                aOrderedMembers.push(oPrimaryMember);
            }

            aSelectedMembers.forEach(function (oMember) {
                if (oPrimaryMember !== oMember) {
                    aOrderedMembers.push(oMember);
                }
            });

            aOrderedMembers.forEach(function (oMember) {
                var sMemberID = fnResolveMemberID(oMember);
                if (sMemberID && aMemberIDs.indexOf(sMemberID) < 0) {
                    aMemberIDs.push(sMemberID);
                }
            });

            return aMemberIDs.join(",");
        },

        _normalizeEditFacilityMatchValue: function (sValue) {
            return String(sValue || "").trim().toLowerCase();
        },

        _findMatchingEditFacilityRawItemIndex: function (aRawItems, oPayloadRow, aUsedIndexes) {
            aRawItems = Array.isArray(aRawItems) ? aRawItems : [];
            aUsedIndexes = Array.isArray(aUsedIndexes) ? aUsedIndexes : [];

            var sRowMode = String(oPayloadRow.SelectionMode || "").trim().toUpperCase();
            var sRowMemberId = this._normalizeEditFacilityMatchValue(oPayloadRow.MemberID);
            var sRowMemberName = this._normalizeEditFacilityMatchValue(oPayloadRow.MemberName);
            var iRowQty = Math.max(parseInt(oPayloadRow.Quantity, 10) || 0, 0);

            var fnIsUsed = function (iIndex) {
                return aUsedIndexes.indexOf(iIndex) >= 0;
            };
            var fnMatches = function (oRawItem, bStrictQuantity) {
                var sRawMode = String(oRawItem.SelectionMode || "").trim().toUpperCase();
                var sRawMemberId = this._normalizeEditFacilityMatchValue(oRawItem.MemberID);
                var sRawMemberName = this._normalizeEditFacilityMatchValue(oRawItem.MemberName || oRawItem.PersonName);
                var iRawQty = Math.max(parseInt(oRawItem.Quantity, 10) || 0, 0);

                if (sRowMode && sRawMode && sRowMode !== sRawMode) {
                    return false;
                }

                if (sRowMemberId && sRawMemberId && sRowMemberId !== sRawMemberId) {
                    return false;
                }

                if (!sRowMemberId && sRowMemberName && sRawMemberName && sRowMemberName !== sRawMemberName) {
                    return false;
                }

                if (bStrictQuantity && iRowQty > 0 && iRawQty > 0 && iRowQty !== iRawQty) {
                    return false;
                }

                return true;
            }.bind(this);

            var iStrictMatch = aRawItems.findIndex(function (oRawItem, iIndex) {
                return !fnIsUsed(iIndex) && fnMatches(oRawItem, true);
            });
            if (iStrictMatch >= 0) {
                return iStrictMatch;
            }

            var iLooseMatch = aRawItems.findIndex(function (oRawItem, iIndex) {
                return !fnIsUsed(iIndex) && fnMatches(oRawItem, false);
            });
            if (iLooseMatch >= 0) {
                return iLooseMatch;
            }

            return aRawItems.findIndex(function (oRawItem, iIndex) {
                return !fnIsUsed(iIndex);
            });
        },

        _buildFacilityPayloadRows: function (oFacility, oHostelModel) {
            var aRows = BookingController.prototype._buildFacilityPayloadRows.call(this, oFacility, oHostelModel);
            var aRawItems = Array.isArray(oFacility.RawFacilityItems) ? oFacility.RawFacilityItems : [];
            var aUsedIndexes = [];
            var sFallbackFacilityId = String(oFacility.FacilityID || "").trim();
            var sBookingID = String(oHostelModel.getProperty("/BookingID") || "").trim();

            return aRows.map(function (oRow) {
                var iRawIndex = this._findMatchingEditFacilityRawItemIndex(aRawItems, oRow, aUsedIndexes);
                var sFacilityId = "";
                var sMemberId = String(oRow.MemberID || "").trim();
                var sMemberName = String(oRow.MemberName || "").trim();

                if (iRawIndex >= 0) {
                    aUsedIndexes.push(iRawIndex);
                    sFacilityId = String(aRawItems[iRawIndex].FacilityID || aRawItems[iRawIndex].ID || "").trim();
                    sMemberId = sMemberId || String(aRawItems[iRawIndex].MemberID || "").trim();
                    sMemberName = sMemberName || String(aRawItems[iRawIndex].MemberName || aRawItems[iRawIndex].PersonName || "").trim();
                }

                return Object.assign({}, oRow, {
                    BookingID: sBookingID,
                    FacilityID: sFacilityId,
                    MemberID: sMemberId,
                    MemberName: sMemberName
                });
            }.bind(this));
        },

        _collectFacilityIdsFromItems: function (aFacilityItems) {
            var aIds = [];

            (Array.isArray(aFacilityItems) ? aFacilityItems : []).forEach(function (oItem) {
                var sFacilityId = String(oItem && (oItem.FacilityID || oItem.ID) || "").trim();
                if (sFacilityId && aIds.indexOf(sFacilityId) < 0) {
                    aIds.push(sFacilityId);
                }
            });

            return aIds;
        },

        _getDeletedFacilityIdsForUpdate: function (aOriginalFacilityItems, aUpdatedFacilityItems) {
            var aOriginalIds = this._collectFacilityIdsFromItems(aOriginalFacilityItems);
            var aUpdatedIds = this._collectFacilityIdsFromItems(aUpdatedFacilityItems);

            return aOriginalIds.filter(function (sFacilityId) {
                return aUpdatedIds.indexOf(sFacilityId) < 0;
            });
        },

        _deleteRemovedFacilityItems: async function (aFacilityIds) {
            var aUniqueIds = [];

            (Array.isArray(aFacilityIds) ? aFacilityIds : []).forEach(function (sFacilityId) {
                sFacilityId = String(sFacilityId || "").trim();
                if (sFacilityId && aUniqueIds.indexOf(sFacilityId) < 0) {
                    aUniqueIds.push(sFacilityId);
                }
            });

            for (var i = 0; i < aUniqueIds.length; i++) {
                await this.ajaxDeleteWithJQuery("HM_BookingFacilityItems", {
                    filters: {
                        FacilityID: aUniqueIds[i]
                    }
                });
            }
        },

        _buildEditUpdatePayload: function (aData, sBookingID) {
            return {
                data: aData,
                filters: {
                    BookingID: sBookingID
                }
            };
        },

        _clearEditBookingTransientState: function () {
            this._backupHostelModel = null;
            this._backupBookingView = null;
            this._backupFacilityModel = null;
            this._backupFacilitySelection = null;
            this._backupAllFacilities = null;
            this._aDeletedFacilityIds = null;
        },

        _handleEditBookingSuccess: function (sMessage, mOptions) {
            mOptions = mOptions || {};
            MessageBox.success(sMessage || "Booking updated successfully.", {
                title: "Success",
                styleClass: "myUnifiedBtn",
                onClose: function () {
                    if (typeof mOptions.afterClose === "function") {
                        mOptions.afterClose();
                    }

                    this._clearEditBookingTransientState();

                    if (this._sReturnRouteAfterEdit === "RouteMyBookings" || mOptions.navigateToManageProfile !== false) {
                        this._navAfterEditBooking();
                    }
                }.bind(this)
            });
        },

        _navAfterEditBooking: function () {
            var oLoginModel = sap.ui.getCore().getModel("LoginModel");
            var sRole = oLoginModel && oLoginModel.getProperty ? String(oLoginModel.getProperty("/Role") || "").trim() : "";
            // Customer role returns to ManageProfile; all other roles return to MyBookings
            var sRoute = sRole === "Customer" ? "RouteManageProfile" : "RouteMyBookings";
            this._sReturnRouteAfterEdit = sRoute;
            this.getOwnerComponent().getRouter().navTo(sRoute);
        },

        _getPaymentDialogField: function (sFieldId) {
            if (!this._oPaymentDialog) {
                return null;
            }

            // Try direct ID lookups first (fastest)
            var oControl = this.byId(sFieldId) ||
                sap.ui.getCore().byId(this._oPaymentDialog.getId() + "--" + sFieldId) ||
                sap.ui.getCore().byId(sFieldId);

            if (oControl) {
                return oControl;
            }

            // Try Fragment.byId for fragment controls
            if (sap.ui.core.Fragment) {
                oControl = sap.ui.core.Fragment.byId(this._oPaymentDialog.getId(), sFieldId);
                if (oControl) {
                    return oControl;
                }
            }

            // Last resort: findAggregatedObjects (slow)
            if (this._oPaymentDialog.findAggregatedObjects) {
                var aMatches = this._oPaymentDialog.findAggregatedObjects(true, function (oControl) {
                    return oControl && oControl.getId && (
                        oControl.getId() === sFieldId ||
                        oControl.getId().slice(-("--" + sFieldId).length) === "--" + sFieldId
                    );
                });
                if (aMatches && aMatches.length > 0) {
                    return aMatches[0];
                }
            }

            return null;
        },

        _getEditDifferencePaymentType: function () {
            var oViewPaymentModel = this.getView().getModel("PaymentModel");
            var sPaymentType = oViewPaymentModel && oViewPaymentModel.getProperty("/PaymentType");

            // Default to "PayOnCheckIn" if not specified, keep "PayOnCheckIn" as is
            if (!sPaymentType) {
                sPaymentType = "PayOnCheckIn";
            }

            return sPaymentType;
        },

        _getDialogPaymentModel: function () {
            return this._oPaymentDialog && this._oPaymentDialog.getModel("PaymentModel");
        },

        _setPaymentDialogSections: function (sPaymentType) {
            var bUPI = sPaymentType === "UPI";
            var bPayOnCheckIn = sPaymentType === "PayOnCheckIn";

            var oUPISection = this._getPaymentDialogField("idUPISection");
            var oCardSection = this._getPaymentDialogField("idCardSection");
            var oRightPanel = this._getPaymentDialogField("idRightPanel");

            if (oUPISection) {
                oUPISection.setVisible(bUPI);
            }

            if (oCardSection) {
                oCardSection.setVisible(false);
            }

            if (oRightPanel) {
                oRightPanel.setVisible(!bPayOnCheckIn);
            }
        },

        onPaymentTypeSelect: function (oEvent) {
            var iSelectedIndex = oEvent.getSource().getSelectedIndex();
            var sPaymentType = iSelectedIndex === 1 ? "UPI" : "PayOnCheckIn";
            var oPaymentModel = this._getDialogPaymentModel() || this.getView().getModel("PaymentModel");
            var fAmount = Number(this._toNumber(this._fDifferenceAmount).toFixed(2));

            if (!oPaymentModel) {
                return;
            }

            oPaymentModel.setProperty("/PaymentType", sPaymentType);
            oPaymentModel.setProperty("/Amount", sPaymentType === "PayOnCheckIn" ? 0 : fAmount);
            oPaymentModel.setProperty("/PayableNow", sPaymentType === "PayOnCheckIn" ? 0 : fAmount);
            oPaymentModel.setProperty("/RemainingBalance", 0);
            oPaymentModel.setProperty(
                "/PaymentDate",
                sPaymentType === "PayOnCheckIn" ? "" : this._formatDateToDDMMYYYY(new Date())
            );

            if (sPaymentType === "PayOnCheckIn") {
                oPaymentModel.setProperty("/BankTransactionID", "");
            }

            this._setPaymentDialogSections(sPaymentType);

            var oAmountField = this._getPaymentDialogField("idAmount");
            if (oAmountField) {
                oAmountField.setValue((sPaymentType === "PayOnCheckIn" ? 0 : fAmount).toFixed(2));
            }

            var oPaymentTypeField = this._getPaymentDialogField("idPaymentTypeField");
            if (oPaymentTypeField) {
                oPaymentTypeField.setValue(sPaymentType);
            }
        },

        onTransactionIDChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var sValue = String(oInput.getValue() || "").trim();
            var oPaymentModel = this._getDialogPaymentModel() || this.getView().getModel("PaymentModel");

            if (oPaymentModel) {
                oPaymentModel.setProperty("/BankTransactionID", sValue);
            }

            utils._LCvalidateMandatoryField(oInput, "ID");

            if (!sValue) {
                oInput.setValueState("None");
            }
        },

        onPaymentDateChange: function (oEvent) {
            var oDatePicker = oEvent.getSource();
            var sValue = oDatePicker.getValue();
            var oPaymentModel = this._getDialogPaymentModel() || this.getView().getModel("PaymentModel");

            if (oPaymentModel) {
                oPaymentModel.setProperty("/PaymentDate", sValue);
            }
            // Validation will be done by utils._LCvalidateDate in _validateAdditionalPaymentFields
        },

        _validateAdditionalPaymentFields: function () {
            var oPaymentModel = this._getDialogPaymentModel();
            var oPaymentData = oPaymentModel ? oPaymentModel.getData() : {};
            var sPaymentType = String(oPaymentData.PaymentType || "").trim();
            var oTransactionField = this._getPaymentDialogField("idTransactionID");
            var oPaymentDateField = this._getPaymentDialogField("idPaymentDate");

            // Pay at check-in does not need verification fields
            if (sPaymentType === "PayOnCheckIn") {
                if (oTransactionField) {
                    oTransactionField.setValue("");
                    oTransactionField.setValueState("None");
                }
                if (oPaymentDateField) {
                    oPaymentDateField.setValue("");
                    oPaymentDateField.setValueState("None");
                }

                if (oPaymentModel) {
                    oPaymentModel.setProperty("/BankTransactionID", "");
                    oPaymentModel.setProperty("/PaymentDate", "");
                }

                return true;
            }

            var sTransactionID = String(
                oPaymentData.BankTransactionID ||
                (oTransactionField && oTransactionField.getValue && oTransactionField.getValue()) ||
                ""
            ).trim();

            var sPaymentDate = String(
                oPaymentData.PaymentDate ||
                (oPaymentDateField && oPaymentDateField.getValue && oPaymentDateField.getValue()) ||
                ""
            ).trim();

            if (oTransactionField) {
                oTransactionField.setValue(sTransactionID);
            }

            if (oPaymentDateField) {
                oPaymentDateField.setValue(sPaymentDate);
            }

            var bTransactionValid = oTransactionField
                ? utils._LCvalidateMandatoryField(oTransactionField, "ID")
                : !!sTransactionID;
            var bDateValid = oPaymentDateField
                ? utils._LCvalidateDate(oPaymentDateField, "ID")
                : /^\d{2}\/\d{2}\/\d{4}$/.test(sPaymentDate);

            if (oTransactionField) {
                oTransactionField.setValueStateText("Enter Transaction ID");
            }

            if (oPaymentDateField) {
                oPaymentDateField.setValueStateText("Select payment date");
            }

            if (oPaymentModel) {
                oPaymentModel.setProperty("/BankTransactionID", sTransactionID);
                oPaymentModel.setProperty("/PaymentDate", sPaymentDate);
            }

            return bTransactionValid && bDateValid;
        },

        onPaymentDialogSubmit: function () {
            if (this.getView().getModel("HostelModel").getProperty("/IsEditMode")) {
                return this._onPaymentSubmit();
            }

            return BookingController.prototype.onSubmitPress.apply(this, arguments);
        },

        _isPaymentDialogSubmission: function (oEvent) {
            var oSource = oEvent && oEvent.getSource ? oEvent.getSource() : null;
            var oParent = oSource;

            while (oParent) {
                if (oParent === this._oPaymentDialog) {
                    return true;
                }

                oParent = oParent.getParent ? oParent.getParent() : null;
            }

            return false;
        },

        _prepareEditUpdatePayments: function (oBookingData, aPayments) {
            oBookingData = oBookingData || {};

            if (oBookingData.PaymentDetails) {
                delete oBookingData.PaymentDetails;
            }

            oBookingData.Payments = Array.isArray(aPayments) ? aPayments : [];

            return oBookingData;
        },

        _validateBookingBeforeUpdate: function () {
            var oModel = this.getView().getModel("HostelModel");
            var oBookingView = this.getView().getModel("BookingView");
            var sPropertyType = String(oModel.getProperty("/PropertyType") || "").trim();
            var bSupportsCustomerGST = this._supportsCustomerGSTOverride(sPropertyType);
            var bIsBusinessTravel = !!oModel.getProperty("/IsBusinessTravel");
            var sCustomerGSTIN = String(oModel.getProperty("/CustomerGSTIN") || "").trim();

            var isMandatoryValid = (
                !!sPropertyType &&
                utils._LCstrictValidationComboBox(this.getView().byId("EditBookRoom_ID"), "ID") &&
                utils._LCvalidateDate(this.getView().byId("EditBookStartdate_ID"), "ID") &&
                utils._LCvalidateDate(this.getView().byId("EditBookEnddate_ID"), "ID")
            );

            if (!isMandatoryValid) {
                sap.m.MessageToast.show("Please fill mandatory booking details");
                return false;
            }

            if ((oBookingView.getProperty("/FamilyMembers") || []).filter(function (oMember) {
                return !!oMember.Selected;
            }).length < 1) {
                sap.m.MessageToast.show("Please select at least one member from the member list.");
                return false;
            }

            // if (!oModel.getProperty("/CustomerEmail") || !oModel.getProperty("/MobileNo")) {
            //     sap.m.MessageToast.show("Please complete contact details before payment");
            //     return false;
            // }

            var sEmail = oModel.getProperty("/CustomerEmail")?.trim();
            if (!sEmail) {
                sap.m.MessageToast.show("Please complete contact details before payment");
                return false;
            }

            if (bSupportsCustomerGST && bIsBusinessTravel) {
                var isGStvalidate = (
                    utils._LCvalidateGstNumber(this.getView().byId("EditBookGst_ID"), "ID") &&
                    utils._LCvalidateMandatoryField(this.getView().byId("EditBookCompanyname_ID"), "ID") &&
                    utils._LCvalidateMandatoryField(this.getView().byId("EditBookconpanyAddress_ID"), "ID")
                );

                if (!isGStvalidate) {
                    sap.m.MessageToast.show("Please fill business GST details");
                    return false;
                }

                if (!this._isValidGSTINValue(sCustomerGSTIN)) {
                    sap.m.MessageToast.show("Please enter a valid GSTIN");
                    return false;
                }
            }

            return true;
        },

        onSubmitPress: async function () {
            if (this._isPaymentDialogSubmission(arguments[0]) &&
                this.getView().getModel("HostelModel").getProperty("/IsEditMode")) {
                return this._onPaymentSubmit();
            }

            if (!this._validateBookingBeforeUpdate()) {
                return;
            }

            try {
                this.getBusyDialog();

                var oHostelModel = this.getView().getModel("HostelModel");
                var sBookingID = oHostelModel.getProperty("/BookingID");
                var sMemberID = oHostelModel.getProperty("/EditMemberID") || "";

                // 1. Fetch current booking data to check payment status
                var oResponse = await this.ajaxReadWithJQuery("HM_Customer", {
                    BookingID: sBookingID,
                    MemberID: sMemberID
                });

                var oCustomer = oResponse && oResponse.Customers || oResponse && oResponse.value && oResponse.value[0] || {};
                var aPayments = await this._readEditPaymentsByBookingId(sBookingID);
                var oBooking = (Array.isArray(oCustomer.Bookings) ? oCustomer.Bookings[0] : oCustomer.Bookings) || {};
                var fOriginalGrandTotal = parseFloat(oBooking.RentPrice || oBooking.GrandTotal || 0);
                var oBookingView = this.getView().getModel("BookingView");

                // Build the update payload
                var oPayloadData = this._buildBookingCreatePayload();
                const oMainData = oPayloadData.data[0];
                oPayloadData.data[0].BookingID = sBookingID;

                const pdfBase64 = await this.onGeneratePDF(oMainData);

                var oHostelData = oHostelModel.getData();

                oPayloadData.data[0].Area = oHostelData.Area || "";
                oPayloadData.data[0].PropertySTD = oHostelData.PropertySTD || "";
                oPayloadData.data[0].PropertyMobileNo = oHostelData.PropertyMobileNo || "";
                oPayloadData.data[0].PropertyEmail = oHostelData.PropertyEmail || "";

                // Add PDF attachment into payload
                oPayloadData.data[0].pdfAttachment = {
                    fileName: "BookingVoucher.pdf",
                    mimeType: "application/pdf",
                    content: pdfBase64
                };

                var aDeletedFacilityIds = this._getDeletedFacilityIdsForUpdate(
                    oCustomer.FacilityItems || [],
                    oPayloadData.data[0].FacilityItems || []
                );
                var fNewGrandTotal = parseFloat(oHostelModel.getProperty("/GrandTotal") || 0);
                var fPaymentPaidAmount = this._getEditPaymentPaidAmount(aPayments);
                oHostelModel.setProperty("/HasExistingPayments", aPayments.length > 0);
                oHostelModel.setProperty("/PaymentPaidAmount", fPaymentPaidAmount);
                this._syncEditRefundInfo(fPaymentPaidAmount, fNewGrandTotal);

                // 2. Check payment status
                if (aPayments.length === 0) {
                    // Case 1: Pay at check-in (offline) - update directly with filters
                    this._prepareEditUpdatePayments(oPayloadData.data[0], []);
                    var oPayload = this._buildEditUpdatePayload(oPayloadData.data, sBookingID);

                    await this.ajaxUpdateWithJQuery("HM_Customer", oPayload);
                    await this._deleteRemovedFacilityItems(aDeletedFacilityIds);

                    this._handleEditBookingSuccess("Booking updated successfully.");
                } else {
                    // Case 2: Online payment - compare new grand total with paid amount
                    var fBalance = fNewGrandTotal - fPaymentPaidAmount;

                    if (fBalance < 0) {
                        // New total is less than paid amount - refund case
                        var fRefundAmount = Math.abs(fBalance); // This is positive

                        // Set refund info BEFORE updating so message strip is visible
                        this._syncEditRefundInfo(fPaymentPaidAmount, fNewGrandTotal, fRefundAmount);

                        // Refund flow does not create a new payment entry.
                        this._prepareEditUpdatePayments(oPayloadData.data[0], []);

                        // Update booking with filters first
                        var oPayload = this._buildEditUpdatePayload(oPayloadData.data, sBookingID);
                        await this.ajaxUpdateWithJQuery("HM_Customer", oPayload);
                        await this._deleteRemovedFacilityItems(aDeletedFacilityIds);

                        oBookingView.setProperty("/editModeEnabled", false);
                        this._handleEditBookingSuccess("Booking updated successfully.", {
                            navigateToManageProfile: false
                        });
                    } else if (fBalance > 0) {
                        // New total is greater than paid amount - additional payment needed
                        this._fDifferenceAmount = fBalance;
                        this._oUpdatePayload = oPayloadData.data;
                        this._sBookingID = sBookingID;
                        this._aDeletedFacilityIds = aDeletedFacilityIds;
                        this._openPaymentDialogForDifference();
                    } else {
                        // New total equals paid amount - no payment change needed
                        this._prepareEditUpdatePayments(oPayloadData.data[0], []);

                        var oPayload = this._buildEditUpdatePayload(oPayloadData.data, sBookingID);

                        await this.ajaxUpdateWithJQuery("HM_Customer", oPayload);
                        await this._deleteRemovedFacilityItems(aDeletedFacilityIds);

                        this._handleEditBookingSuccess("Booking updated successfully.");
                    }
                }

            } catch (oError) {
                MessageBox.error("Unable to update booking: " + (oError.message || "Unknown error"));
            } finally {
                this.closeBusyDialog();
            }
        },

        _openPaymentDialogForDifference: function () {
            if (!this._oPaymentDialog) {
                // Load PaymentPage fragment
                this.loadFragment({
                    name: "sap.ui.com.project1.fragment.PaymentPage",
                    controller: this
                }).then(function (oDialog) {
                    this._oPaymentDialog = oDialog;
                    this._setupPaymentDialog();
                    this._oPaymentDialog.open();
                }.bind(this)).catch(function (oError) {
                    MessageBox.error("Failed to load payment dialog: " + (oError.message || "Unknown error"));
                }.bind(this));
            } else {
                this._setupPaymentDialog();
                this._oPaymentDialog.open();
            }
        },

        _parseTimeToHours: function (sTime) {
            if (!sTime) return 0;
            sTime = sTime.trim().toUpperCase();
            var bIsPM = sTime.includes("PM");
            var bIsAM = sTime.includes("AM");
            sTime = sTime.replace(/AM|PM/gi, "").trim();
            var aParts = sTime.split(":");
            var iHours = parseInt(aParts[0], 10) || 0;
            var iMinutes = parseInt(aParts[1], 10) || 0;
            if (bIsPM && iHours < 12) {
                iHours += 12;
            } else if (bIsAM && iHours === 12) {
                iHours = 0;
            }
            return iHours + (iMinutes / 60);
        },

        _isWithin48HoursOfCheckIn: function (sStartDate, sCheckInTime, vEditBefore) {
            // Resolve the configured edit window (in hours) from the branch data.
            // CRITICAL RULE: empty/0/null/undefined => NO time restriction, editing allowed.
            var sEditBeforeValue = vEditBefore == null ? "" : String(vEditBefore).trim();
            if (sEditBeforeValue === "" || sEditBeforeValue === "0") {
                this._iEditHoursWindow = 0;
                return false;
            }
            var iHoursWindow = parseInt(sEditBeforeValue, 10);
            this._iEditHoursWindow = iHoursWindow;
            if (isNaN(iHoursWindow) || iHoursWindow <= 0) {
                return false;
            }
            var oStartDate = this._parseDate(sStartDate);
            if (!oStartDate) {
                return false;
            }
            var fCheckInHours = this._parseTimeToHours(sCheckInTime);
            oStartDate.setHours(Math.floor(fCheckInHours), Math.round((fCheckInHours % 1) * 60), 0, 0);
            var oCutoff = new Date(oStartDate.getTime() - iHoursWindow * 60 * 60 * 1000);
            var oNow = new Date();
            return oNow >= oCutoff;
        },

        _formatDateToDDMMYYYY: function (oDate) {
            if (!oDate || !(oDate instanceof Date) || isNaN(oDate.getTime())) {
                return "";
            }
            var iDay = oDate.getDate();
            var iMonth = oDate.getMonth() + 1;
            var iYear = oDate.getFullYear();
            return (iDay < 10 ? "0" + iDay : iDay) + "/" +
                (iMonth < 10 ? "0" + iMonth : iMonth) + "/" +
                iYear;
        },

        _setupPaymentDialog: function () {
            if (!this._oPaymentDialog) return;

            var oHostelModel = this.getView().getModel("HostelModel");
            var sPaymentType = this._getEditDifferencePaymentType();
            var fDifferenceAmount = Number(this._toNumber(this._fDifferenceAmount).toFixed(2));
            var sToday = this._formatDateToDDMMYYYY(new Date());

            var oPaymentModel = new sap.ui.model.json.JSONModel({
                Amount: sPaymentType === "PayOnCheckIn" ? 0 : fDifferenceAmount,
                PaymentType: sPaymentType,
                PaymentDate: sPaymentType === "PayOnCheckIn" ? "" : sToday,
                BankTransactionID: "",
                PayableNow: sPaymentType === "PayOnCheckIn" ? 0 : fDifferenceAmount,
                RemainingBalance: 0
            });

            this._oPaymentDialog.setModel(oPaymentModel, "PaymentModel");
            this._oPaymentDialog.setModel(oHostelModel, "HostelModel");

            // Set dialog title
            var oCustomHeader = this._oPaymentDialog.getCustomHeader();
            if (oCustomHeader && oCustomHeader.getContentMiddle) {
                var aContentMiddle = oCustomHeader.getContentMiddle();
                if (aContentMiddle && aContentMiddle.length > 0) {
                    var oTitle = aContentMiddle[0];
                    if (oTitle && oTitle.setText) {
                        oTitle.setText("Pay Additional Amount");
                    }
                }
            }

            // Resolve fragment fields through the dialog-prefixed global IDs.
            var oAmountField = this._getPaymentDialogField("idAmount");
            if (oAmountField) {
                oAmountField.setValue(fDifferenceAmount.toFixed(2));
                oAmountField.setEditable(false);
            }

            // Update payment type field
            var oPaymentTypeField = this._getPaymentDialogField("idPaymentTypeField");
            if (oPaymentTypeField) {
                oPaymentTypeField.setValue(sPaymentType);
                oPaymentTypeField.setEditable(false);
            }

            // Set DatePicker value directly
            var oPaymentDateField = this._getPaymentDialogField("idPaymentDate");
            if (oPaymentDateField) {
                oPaymentDateField.setValue(sPaymentType === "PayOnCheckIn" ? "" : sToday);
                oPaymentDateField.setValueState("None");
            }

            // Set radio button selection
            var oPaymentTypeGroup = this._getPaymentDialogField("idPaymentTypeGroup");
            if (oPaymentTypeGroup) {
                oPaymentTypeGroup.setSelectedIndex(sPaymentType === "UPI" ? 1 : 0);
            }

            this._setPaymentDialogSections(sPaymentType);
        },

        _onPaymentSubmit: async function () {
            try {
                var oPaymentModel = this._oPaymentDialog.getModel("PaymentModel");
                var oPaymentData = oPaymentModel.getData();

                if (!this._validateAdditionalPaymentFields()) {
                    sap.m.MessageToast.show("Please complete payment verification details");
                    return;
                }

                this.getBusyDialog();

                // Create payment payload
                var oHostelModel = this.getView().getModel("HostelModel");
                var fAmount = Number(this._toNumber(oPaymentData.Amount || this._fDifferenceAmount).toFixed(2));
                var bPayOnCheckIn = String(oPaymentData.PaymentType || "").trim() === "PayOnCheckIn";

                // Update booking with payment
                var oPayload = {
                    data: this._oUpdatePayload,
                    filters: {
                        BookingID: this._sBookingID
                    }
                };

                this._prepareEditUpdatePayments(oPayload.data[0], []);

                await this.ajaxUpdateWithJQuery("HM_Customer", oPayload);
                await this._deleteRemovedFacilityItems(this._aDeletedFacilityIds);

                if (!bPayOnCheckIn) {
                    await this.ajaxCreateWithJQuery("HM_Payment", {
                        data: {
                            BookingID: this._sBookingID,
                            Date: oPaymentData.PaymentDate || this._formatDateToDDMMYYYY(new Date()),
                            BankName: oPaymentData.PaymentType,
                            Amount: fAmount.toFixed(2),
                            PaymentType: oPaymentData.PaymentType,
                            BankTransactionID: String(oPaymentData.BankTransactionID || "").trim(),
                            CustomerName: oHostelModel.getProperty("/CustomerName") || "",
                            Currency: oHostelModel.getProperty("/Currency") || "INR",
                            Used: "",
                            BranchCode: oHostelModel.getProperty("/BranchCode") || "",
                            BranchName: oHostelModel.getProperty("/BranchName") || "",
                            InvNo: ""
                        }
                    });
                }

                oHostelModel.setProperty("/HasExistingPayments",
                    this._toNumber(oHostelModel.getProperty("/PaymentPaidAmount")) + (bPayOnCheckIn ? 0 : this._toNumber(this._fDifferenceAmount)) > 0
                );
                this._syncEditRefundInfo(
                    this._toNumber(oHostelModel.getProperty("/PaymentPaidAmount")) + (bPayOnCheckIn ? 0 : this._toNumber(this._fDifferenceAmount)),
                    oHostelModel.getProperty("/GrandTotal")
                );

                this._oPaymentDialog.close();

                this._handleEditBookingSuccess(bPayOnCheckIn
                    ? "Booking updated successfully."
                    : "Payment successful and booking updated.");

            } catch (oError) {
                MessageBox.error("Payment failed: " + (oError.message || "Unknown error"));
            } finally {
                this.closeBusyDialog();
            }
        },

        _generateUUID: function () {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },

        _normalizeEditFacilityKey: function (sValue) {
            return String(sValue || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        },

        _normalizeEditPersonKey: function (sValue) {
            return String(sValue || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        },

        _findSelectedFacilityForEdit: function (oFacility, aSelectedFacilities) {
            aSelectedFacilities = Array.isArray(aSelectedFacilities) ? aSelectedFacilities : [];

            var sFacilityId = String(oFacility.ID || oFacility.FacilityID || "").trim();
            var sFacilityNameKey = this._normalizeEditFacilityKey(oFacility.FacilityName || oFacility.Type || "");
            var sSelectionMode = String(oFacility.SelectionMode || this._getFacilitySelectionMode(oFacility) || "").trim().toUpperCase();
            var sChargeType = this._normalizeFacilityChargeType(oFacility.FacilityChargeType);

            if (sFacilityId) {
                var oById = aSelectedFacilities.find(function (oSelected) {
                    return String(oSelected.CatalogFacilityID || oSelected.FacilityID || oSelected.ID || "").trim() === sFacilityId;
                });
                if (oById) {
                    return oById;
                }
            }

            return aSelectedFacilities.find(function (oSelected) {
                var sSelectedNameKey = this._normalizeEditFacilityKey(oSelected.FacilityName || oSelected.Type || "");
                var sSelectedSelectionMode = String(oSelected.SelectionMode || "").trim().toUpperCase();
                var sSelectedChargeType = this._normalizeFacilityChargeType(oSelected.FacilityChargeType || oSelected.ApiFacilityChargeType);
                var bMatchingMode = !sSelectionMode || !sSelectedSelectionMode || sSelectedSelectionMode === sSelectionMode;
                var bMatchingChargeType = sSelectionMode !== "PERSON_QTY" || !sSelectedChargeType || sSelectedChargeType === sChargeType;
                return sFacilityNameKey && sSelectedNameKey && bMatchingMode && bMatchingChargeType &&
                    (sSelectedNameKey === sFacilityNameKey ||
                        sSelectedNameKey.indexOf(sFacilityNameKey) >= 0 ||
                        sFacilityNameKey.indexOf(sSelectedNameKey) >= 0);
            }.bind(this)) || {};
        },

        _getEditFacilityOccupants: function () {
            var oBookingView = this.getView().getModel("BookingView");
            var aMembers = oBookingView && Array.isArray(oBookingView.getProperty("/FamilyMembers"))
                ? oBookingView.getProperty("/FamilyMembers") : [];

            return aMembers.filter(function (oMember) {
                return !!oMember.Selected;
            }).map(function (oMember) {
                var sId = String(oMember.id || oMember.MemberID || oMember.ID || "").trim();
                var sMemberId = String(oMember.MemberID || oMember.ID || "").trim();
                var sName = String(oMember.Name || oMember.FullName || "").trim();
                var sSalutation = String(oMember.Salutation || "").trim();
                var sDisplayName = sSalutation && sName ? sSalutation + " " + sName : (sName || oMember.Relation || "Family Member");
                var aAliases = [
                    sId,
                    sMemberId,
                    oMember.UserID,
                    oMember.ID,
                    oMember.Name,
                    oMember.FullName,
                    sDisplayName
                ];

                return {
                    id: sId,
                    memberId: sMemberId,
                    name: sDisplayName,
                    aliases: aAliases.map(function (sAlias) {
                        return String(sAlias || "").trim();
                    }).filter(Boolean)
                };
            });
        },

        _resolveEditFacilityOccupant: function (sPersonId, sPersonName) {
            var aOccupants = this._getEditFacilityOccupants();
            var sRawId = String(sPersonId || "").trim();
            var sRawName = String(sPersonName || "").trim();
            var sNormId = this._normalizeEditPersonKey(sRawId);
            var sNormName = this._normalizeEditPersonKey(sRawName);

            if (!aOccupants.length) {
                return null;
            }

            var oMatch = null;
            if (sNormId) {
                oMatch = aOccupants.find(function (oOccupant) {
                    return oOccupant.aliases.some(function (sAlias) {
                        return this._normalizeEditPersonKey(sAlias) === sNormId;
                    }.bind(this));
                }.bind(this));
            }

            if (!oMatch && sNormName) {
                oMatch = aOccupants.find(function (oOccupant) {
                    return oOccupant.aliases.some(function (sAlias) {
                        var sNormAlias = this._normalizeEditPersonKey(sAlias);
                        return sNormAlias && (sNormAlias === sNormName || sNormAlias.indexOf(sNormName) >= 0 || sNormName.indexOf(sNormAlias) >= 0);
                    }.bind(this));
                }.bind(this));
            }

            if (!oMatch && aOccupants.length === 1) {
                oMatch = aOccupants[0];
            }

            return oMatch || null;
        },

        _buildEditFacilityPersonQuantities: function (oSelectedFacility) {
            var aLines = Array.isArray(oSelectedFacility.PersonQuantities) ? oSelectedFacility.PersonQuantities : [];
            var mByPersonId = {};

            aLines.forEach(function (oLine) {
                var oOccupant = this._resolveEditFacilityOccupant(oLine.personId, oLine.personName);
                var sPersonId = oOccupant ? oOccupant.id : String(oLine.personId || "").trim();
                var sPersonName = oOccupant ? oOccupant.name : String(oLine.personName || "").trim();
                var iQty = Math.max(parseInt(oLine.qty, 10) || 0, 0);

                if (!sPersonId && !sPersonName) {
                    return;
                }

                if (!sPersonId) {
                    sPersonId = sPersonName;
                }

                if (!mByPersonId[sPersonId]) {
                    mByPersonId[sPersonId] = {
                        personId: sPersonId,
                        personName: sPersonName || sPersonId,
                        selected: iQty > 0,
                        qty: 0
                    };
                }

                mByPersonId[sPersonId].qty += iQty;
                mByPersonId[sPersonId].selected = mByPersonId[sPersonId].selected || iQty > 0;
                if (sPersonName) {
                    mByPersonId[sPersonId].personName = sPersonName;
                }
            }.bind(this));

            var aResult = Object.keys(mByPersonId).map(function (sKey) {
                return mByPersonId[sKey];
            });

            if (aResult.length === 0 && (parseInt(oSelectedFacility.SavedQuantity || oSelectedFacility.Quantity, 10) || 0) > 0) {
                var oDefaultOccupant = this._getDefaultOccupant && this._getDefaultOccupant();
                if (oDefaultOccupant) {
                    aResult.push({
                        personId: oDefaultOccupant.id,
                        personName: oDefaultOccupant.name,
                        selected: true,
                        qty: Math.max(parseInt(oSelectedFacility.SavedQuantity || oSelectedFacility.Quantity, 10) || 0, 0)
                    });
                }
            }

            return aResult;
        },

        _buildEditFacilitySelectedPersonIds: function (oSelectedFacility, aPersonQuantities) {
            var aSelectedIds = [];
            var fnAdd = function (sId) {
                sId = String(sId || "").trim();
                if (sId && aSelectedIds.indexOf(sId) < 0) {
                    aSelectedIds.push(sId);
                }
            };

            (Array.isArray(oSelectedFacility.SelectedPersonIds) ? oSelectedFacility.SelectedPersonIds : []).forEach(function (sPersonId) {
                var oOccupant = this._resolveEditFacilityOccupant(sPersonId, "");
                fnAdd(oOccupant ? oOccupant.id : sPersonId);
            }.bind(this));

            (Array.isArray(aPersonQuantities) ? aPersonQuantities : []).forEach(function (oLine) {
                if ((parseInt(oLine.qty, 10) || 0) > 0 || oLine.selected) {
                    fnAdd(oLine.personId);
                }
            });

            return aSelectedIds;
        },

        _deriveEditFacilitySelectedPrice: function (oSelectedFacility, oFacility, sSelectionMode) {
            if (sSelectionMode === "PERSON_QTY") {
                return this._getFirstAvailableNumber(
                    oFacility.MinimumPrice,
                    oSelectedFacility.MinimumPrice,
                    oSelectedFacility.PackagePrice,
                    oSelectedFacility.SelectedPrice,
                    oSelectedFacility.Price
                );
            }

            var fSelectedPrice = this._getFirstAvailableNumber(oSelectedFacility.SelectedPrice, oSelectedFacility.Price, oSelectedFacility.BasicFacilityPrice);
            var fSavedTotal = this._toNumber(oSelectedFacility.SavedTotalAmount);
            var iQuantity = Math.max(parseInt(oSelectedFacility.Quantity || oSelectedFacility.SavedQuantity, 10) || 0, 0);
            var iPersonQtyTotal = Array.isArray(oSelectedFacility.PersonQuantities)
                ? oSelectedFacility.PersonQuantities.reduce(function (iSum, oLine) {
                    return iSum + (Math.max(parseInt(oLine.qty, 10) || 0, 0));
                }, 0) : 0;

            if (fSelectedPrice > 0) {
                return fSelectedPrice;
            }

            if (sSelectionMode === "QTY" && fSavedTotal > 0 && iQuantity > 0) {
                return Number((fSavedTotal / iQuantity).toFixed(2));
            }

            if (sSelectionMode === "PERSON_QTY" && fSavedTotal > 0 && iPersonQtyTotal > 0) {
                return Number((fSavedTotal / iPersonQtyTotal).toFixed(2));
            }

            if (sSelectionMode === "PERSON" && fSavedTotal > 0) {
                var iPersonCount = Math.max((oSelectedFacility.SelectedPersonIds || []).length, 1);
                return Number((fSavedTotal / iPersonCount).toFixed(2));
            }

            return this._toNumber(oFacility.UnitPrice || oFacility.BasicFacilityPrice || oFacility.PerDayPrice || oFacility.PerMonthPrice || oFacility.PerYearPrice || 0);
        },

        _applyEditFacilityPriceFilter: function () {
            var oHostelModel = this.getView().getModel("HostelModel");
            var oFacilityModel = this.getView().getModel("FacilityModel");
            var sPlan = oHostelModel && oHostelModel.getProperty("/SelectedPriceType");
            var aVisibleFacilities = [];

            if (!oFacilityModel) {
                return;
            }

            (this._aAllFacilities || []).forEach(function (oFacility) {
                var aPriceOptions = this._buildFacilityPriceOptions(oFacility) || [];
                var oMatchedOption = aPriceOptions.find(function (oOption) {
                    return oOption.key === sPlan;
                }) || aPriceOptions.find(function (oOption) {
                    return oOption.key === "Unit Price" || oOption.key === "Package Price";
                });

                oFacility.SelectionMode = oFacility.SelectionMode || this._getFacilitySelectionMode(oFacility);
                oFacility.SelectionModeLabel = this._getFacilitySelectionModeLabel(oFacility.SelectionMode);

                if (oFacility.Selected) {
                    var fSavedPrice = this._getFirstAvailableNumber(oFacility.SelectedPrice, oFacility.Price, oFacility.BasicFacilityPrice, oFacility.CurrentPrice);
                    var sSavedPriceType = oFacility.SelectedPriceType || oFacility.UnitText || (oMatchedOption && oMatchedOption.key) || "Unit Price";

                    if (oFacility.SelectionMode === "PERSON_QTY") {
                        fSavedPrice = this._getFirstAvailableNumber(
                            oFacility.MinimumPrice,
                            oFacility.PackagePrice,
                            fSavedPrice,
                            (oMatchedOption && oMatchedOption.price)
                        );
                        sSavedPriceType = "Package Price";
                    }

                    if (!fSavedPrice && oMatchedOption) {
                        fSavedPrice = this._toNumber(oMatchedOption.price);
                    }

                    oFacility.CurrentPrice = fSavedPrice;
                    oFacility.CurrentPriceType = sSavedPriceType;
                    oFacility.SelectedPrice = fSavedPrice;
                    oFacility.SelectedPriceType = sSavedPriceType;
                    oFacility.DisplayPrice = this._formatFacilityPriceWithUnit(
                        fSavedPrice,
                        oFacility.Currency || "INR",
                        sSavedPriceType
                    );
                    oFacility.FacilityChargeType = this._supportsFacilityChargeType(oFacility.SelectionMode)
                        ? this._getFacilityChargeType(oFacility)
                        : "";
                    this._setFacilitySelectionSummary(oFacility);
                    aVisibleFacilities.push(oFacility);
                    return;
                }

                if (oMatchedOption) {
                    oFacility.CurrentPrice = this._toNumber(oMatchedOption.price);
                    oFacility.CurrentPriceType = oMatchedOption.key;
                    oFacility.DisplayPrice = this._formatFacilityPriceWithUnit(
                        oFacility.CurrentPrice,
                        oFacility.Currency || "INR",
                        oFacility.CurrentPriceType
                    );
                    oFacility.FacilityChargeType = this._getFacilityChargeType(oFacility);
                    this._setFacilitySelectionSummary(oFacility);
                    aVisibleFacilities.push(oFacility);
                }
            }.bind(this));

            oFacilityModel.setProperty("/Facilities", aVisibleFacilities);
            oFacilityModel.refresh(true);
            this._renderFacilityCards();
            this._rebuildSelectedFacilities();
        },

        /**
         * Override _rebuildSelectedFacilities to use facility-item-specific dates
         * instead of the booking-wide date range. This ensures each facility item's
         * total is calculated using its own StartDate/EndDate.
         */
        _rebuildSelectedFacilities: function () {
            var oModel = this.getView().getModel("HostelModel");
            var oFacilityModel = this.getView().getModel("FacilityModel");
            var that = this;

            var aOccupants = this._getEditFacilityOccupants
                ? this._getEditFacilityOccupants()
                : (this._getOccupantOptions ? this._getOccupantOptions() : []);

            var fnGetPersonName = function (sPersonId) {
                var oFound = aOccupants.find(function (oPerson) {
                    return oPerson.id === sPersonId;
                });
                return oFound ? oFound.name : sPersonId;
            };

            var aSelectedFacilities = (this._aAllFacilities || [])
                .filter(function (oFacility) {
                    return !!oFacility.Selected;
                })
                .map(function (oFacility) {
                    var sSelectionMode = oFacility.SelectionMode || this._getFacilitySelectionMode(oFacility);
                    var sPriceType = oFacility.SelectedPriceType || oFacility.CurrentPriceType || "Unit Price";
                    var sCurrency = oFacility.Currency || "INR";
                    var sFacilityChargeType = this._getFacilityChargeType(oFacility);
                    var aSelectedPersonIds = Array.isArray(oFacility.SelectedPersonIds) ? oFacility.SelectedPersonIds : [];
                    var aPersonQuantities = Array.isArray(oFacility.PersonQuantities) ? oFacility.PersonQuantities : [];

                    var fTotal = 0;
                    var sBreakdown = "";
                    var sAllocationDetails = "";

                    // Build a facility-like object with per-item dates for _calculateFacilityTotal
                    var oCalcItem = {
                        BasicFacilityPrice: this._getFirstAvailableNumber(oFacility.SelectedPrice, oFacility.CurrentPrice, oFacility.BasicFacilityPrice),
                        UnitText: sPriceType,
                        Quantity: oFacility.Quantity || 1,
                        FacilityChargeType: sFacilityChargeType
                    };

                    // Booking dates as fallback when facility dates are null
                    var oBookingStart = oModel.getProperty("/StartDate");
                    var oBookingEnd = oModel.getProperty("/EndDate");
                    var bUseBookingDates = this._isBookingDateDependentFacility(oFacility);

                    if (bUseBookingDates) {
                        // Condition 1: facility follows booking dates — duration changes propagate
                        oCalcItem.StartDate = oBookingStart;
                        oCalcItem.EndDate = oBookingEnd;
                        oCalcItem.StartTime = null;
                        oCalcItem.EndTime = null;
                        oCalcItem.TotalHour = oFacility.TotalHour ||
                            (Array.isArray(oFacility.RawFacilityItems) && oFacility.RawFacilityItems.length > 0
                                ? oFacility.RawFacilityItems[0].TotalHour : null) || null;
                    } else if (Array.isArray(oFacility.RawFacilityItems) && oFacility.RawFacilityItems.length > 0) {
                        // Condition 2: facility has admin-set dates/times — use them
                        var oFirstRaw = oFacility.RawFacilityItems[0];
                        oCalcItem.StartDate = oFirstRaw.StartDate || oFacility.StartDate || oBookingStart || null;
                        oCalcItem.EndDate = oFirstRaw.EndDate || oFacility.EndDate || oBookingEnd || null;
                        oCalcItem.StartTime = oFirstRaw.StartTime || oFacility.StartTime || null;
                        oCalcItem.EndTime = oFirstRaw.EndTime || oFacility.EndTime || null;
                        oCalcItem.TotalHour = oFirstRaw.TotalHour || oFacility.TotalHour || null;
                    } else {
                        oCalcItem.StartDate = oFacility.StartDate || oBookingStart || null;
                        oCalcItem.EndDate = oFacility.EndDate || oBookingEnd || null;
                        oCalcItem.StartTime = oFacility.StartTime || null;
                        oCalcItem.EndTime = oFacility.EndTime || null;
                        oCalcItem.TotalHour = oFacility.TotalHour || null;
                    }

                    if (sSelectionMode === "SINGLE") {
                        fTotal = this._calculateFacilityTotal(oCalcItem);
                        sBreakdown = this._buildFacilityPeriodBreakdown(oCalcItem, 1);
                        sAllocationDetails = JSON.stringify({
                            selectionMode: sSelectionMode,
                            roomCount: 1
                        });
                    } else if (sSelectionMode === "QTY") {
                        fTotal = this._calculateFacilityTotal(oCalcItem);
                        var iQty = Math.max(parseInt(oFacility.Quantity, 10) || 1, 1);
                        sBreakdown = this._buildFacilityPeriodBreakdown(oCalcItem, iQty);
                        sAllocationDetails = JSON.stringify({
                            selectionMode: sSelectionMode,
                            quantity: iQty
                        });
                    } else if (sSelectionMode === "PERSON") {
                        // Per-person calculation: each person has their own date range
                        var oPerPersonResult = this._calculatePerPersonTotal(oFacility, aOccupants);
                        fTotal = oPerPersonResult.total;
                        // Build breakdown showing each person's individual calculation
                        var aPersonLines = oPerPersonResult.personBreakdown.map(function (oPerson) {
                            var sUnitLabel = "";
                            var sUnitKey = (oPerson.priceType || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
                            if (sUnitKey === "PERDAY") { sUnitLabel = oPerson.dayCount + " day(s)"; }
                            else if (sUnitKey === "PERMONTH") { sUnitLabel = oPerson.monthCount + " month(s)"; }
                            else if (sUnitKey === "PERYEAR") { sUnitLabel = oPerson.yearCount + " year(s)"; }
                            else if (sUnitKey === "PERHOUR") { sUnitLabel = oPerson.dayCount + " day(s) × " + oPerson.hourCount + " hr(s)"; }
                            else { sUnitLabel = "flat"; }
                            return oPerson.personName + " (" + sUnitLabel + " × ₹" + oPerson.price.toFixed(2) + " = ₹" + oPerson.personTotal.toFixed(2) + ")";
                        });
                        sBreakdown = aPersonLines.join(", ");
                        sAllocationDetails = JSON.stringify({
                            selectionMode: sSelectionMode,
                            selectedPersons: oPerPersonResult.personBreakdown.map(function (oPerson) {
                                return {
                                    personId: oPerson.personId,
                                    personName: oPerson.personName,
                                    dayCount: oPerson.dayCount,
                                    monthCount: oPerson.monthCount,
                                    yearCount: oPerson.yearCount,
                                    hourCount: oPerson.hourCount,
                                    personTotal: oPerson.personTotal
                                };
                            })
                        });
                    } else if (sSelectionMode === "PERSON_QTY") {
                        // Per-person calculation: each person has their own date range
                        var oPerPersonResult = this._calculatePerPersonTotal(oFacility, aOccupants);
                        fTotal = oPerPersonResult.total;
                        // Build breakdown showing each person's individual calculation
                        var aPersonLines = oPerPersonResult.personBreakdown.map(function (oPerson) {
                            if (oPerson.chargeType === "DAILY") {
                                return oPerson.personName + " (₹" + oPerson.packagePrice.toFixed(2) + " × " + Math.max(oPerson.dayCount, 1) + " day(s) = ₹" + oPerson.personTotal.toFixed(2) + ")";
                            }
                            if (oPerson.chargeType === "Entire Booking") {
                                return oPerson.personName + " (₹" + oPerson.packagePrice.toFixed(2) + " = ₹" + oPerson.personTotal.toFixed(2) + ")";
                            }
                            return oPerson.personName + " (₹" + oPerson.packagePrice.toFixed(2) + " × " + oPerson.quantity + " = ₹" + oPerson.personTotal.toFixed(2) + ")";
                        });
                        sBreakdown = aPersonLines.join(", ");
                        sAllocationDetails = JSON.stringify({
                            selectionMode: sSelectionMode,
                            facilityChargeType: sFacilityChargeType,
                            selectedPersons: oPerPersonResult.personBreakdown.map(function (oPerson) {
                                return {
                                    personId: oPerson.personId,
                                    personName: oPerson.personName,
                                    quantity: oPerson.quantity,
                                    chargeType: oPerson.chargeType,
                                    dayCount: oPerson.dayCount,
                                    personTotal: oPerson.personTotal
                                };
                            })
                        });
                    } else {
                        fTotal = this._calculateFacilityTotal(oCalcItem);
                        sBreakdown = this._buildFacilityPeriodBreakdown(oCalcItem, 1);
                        sAllocationDetails = JSON.stringify({
                            selectionMode: "SINGLE",
                            roomCount: 1
                        });
                    }

                    return {
                        FacilityID: oFacility.FacilityID,
                        CatalogFacilityID: oFacility.CatalogFacilityID,
                        FacilityName: oFacility.FacilityName,
                        DisplayFacilityName: oFacility.DisplayFacilityName || oFacility.FacilityName,
                        Currency: sCurrency,
                        SelectionMode: sSelectionMode,
                        Price: this._getFirstAvailableNumber(oFacility.SelectedPrice, oFacility.CurrentPrice, oFacility.BasicFacilityPrice),
                        UnitText: sPriceType,
                        FacilityChargeType: sFacilityChargeType,
                        Quantity: Math.max(parseInt(oFacility.Quantity, 10) || 1, 1),
                        SelectedPersonIds: aSelectedPersonIds.slice(),
                        PersonQuantities: aPersonQuantities.map(function (oLine) {
                            return {
                                personId: oLine.personId,
                                personName: oLine.personName || fnGetPersonName(oLine.personId),
                                qty: Math.max(parseInt(oLine.qty, 10) || 0, 0)
                            };
                        }),
                        MinimumQty: parseInt(oFacility.MinimumQty, 10) || 0,
                        MinimumPrice: parseFloat(oFacility.MinimumPrice) || 0,
                        AllocationDetails: sAllocationDetails,
                        RateText: sSelectionMode === "PERSON_QTY"
                            ? this._formatFacilityPriceWithUnit(
                                this._toNumber(oFacility.MinimumPrice),
                                sCurrency,
                                "Package Price"
                            )
                            : this._formatFacilityPriceWithUnit(
                                this._getFirstAvailableNumber(oFacility.SelectedPrice, oFacility.CurrentPrice, oFacility.BasicFacilityPrice),
                                sCurrency,
                                sPriceType
                            ),
                        TotalAmount: Number(fTotal.toFixed(2)),
                        BreakdownText: sBreakdown,
                        RawFacilityItems: Array.isArray(oFacility.RawFacilityItems)
                            ? oFacility.RawFacilityItems.map(function (oItem) {
                                return Object.assign({}, oItem);
                            })
                            : []
                    };
                }.bind(this));

            oModel.setProperty("/AllSelectedFacilities", aSelectedFacilities);
            oModel.setProperty("/FacilityDiscounts", []);
            oModel.setProperty("/TotalFacilityDiscount", 0);
            oModel.setProperty("/HasFacilityOfferDiscount", false);
            oModel.setProperty("/HasValidFacilityOffer", false);
            oModel.setProperty(
                "/TotalFacilityPrice",
                Number(
                    aSelectedFacilities.reduce(function (sum, oItem) {
                        return sum + (this._toNumber(oItem.TotalAmount));
                    }.bind(this), 0).toFixed(2)
                )
            );

            if (oFacilityModel) {
                oFacilityModel.refresh(true);
            }

            this._renderFacilityCards();
        },

        /**
         * Override _getFacilityCardTotalAmount to use facility-specific dates
         * instead of booking-wide dates. Mimics EditBookingDetails' price × days
         * pattern while respecting UnitText pricing rules via _calculateFacilityTotal.
         */
        _getFacilityCardTotalAmount: function (oFacility) {
            if (!oFacility || !oFacility.Selected) {
                return 0;
            }
            var sSelectionMode = oFacility.SelectionMode || this._getFacilitySelectionMode(oFacility);
            var sPriceType = oFacility.SelectedPriceType || oFacility.CurrentPriceType || "Unit Price";
            var oHostelModel = this.getView().getModel("HostelModel");

            // Build calc item with appropriate dates based on condition 1/2
            var bUseBookingDates = this._isBookingDateDependentFacility(oFacility);
            var oCalcItem = {
                BasicFacilityPrice: this._getFirstAvailableNumber(oFacility.SelectedPrice, oFacility.CurrentPrice, oFacility.BasicFacilityPrice),
                UnitText: sPriceType,
                Quantity: oFacility.Quantity || 1,
                FacilityChargeType: this._getFacilityChargeType(oFacility)
            };

            if (bUseBookingDates) {
                oCalcItem.StartDate = oHostelModel ? oHostelModel.getProperty("/StartDate") : null;
                oCalcItem.EndDate = oHostelModel ? oHostelModel.getProperty("/EndDate") : null;
                oCalcItem.StartTime = null;
                oCalcItem.EndTime = null;
                oCalcItem.TotalHour = oFacility.TotalHour || null;
            } else {
                oCalcItem.StartDate = oFacility.StartDate || (oHostelModel ? oHostelModel.getProperty("/StartDate") : null) || null;
                oCalcItem.EndDate = oFacility.EndDate || (oHostelModel ? oHostelModel.getProperty("/EndDate") : null) || null;
                oCalcItem.StartTime = oFacility.StartTime || null;
                oCalcItem.EndTime = oFacility.EndTime || null;
                oCalcItem.TotalHour = oFacility.TotalHour || null;
            }

            var fBaseTotal = this._calculateFacilityTotal(oCalcItem);
            var iPersonCount = Array.isArray(oFacility.SelectedPersonIds)
                ? oFacility.SelectedPersonIds.length
                : 0;

            if (sSelectionMode === "PERSON") {
                var aOccupants = this._getEditFacilityOccupants
                    ? this._getEditFacilityOccupants()
                    : (this._getOccupantOptions ? this._getOccupantOptions() : []);
                return this._calculatePerPersonTotal(oFacility, aOccupants).total;
            }

            if (sSelectionMode === "PERSON_QTY") {
                var aOccupants = this._getEditFacilityOccupants
                    ? this._getEditFacilityOccupants()
                    : (this._getOccupantOptions ? this._getOccupantOptions() : []);
                return this._calculatePerPersonTotal(oFacility, aOccupants).total;
            }

            // SINGLE and QTY — _calculateFacilityTotal handles Quantity and UnitText rules
            return fBaseTotal;
        },

        /**
         * Override _getFacilityCardSummaryText to show calculation breakdown
         * on the facility card when facility dates differ from booking dates.
         */
        _getFacilityCardSummaryText: function (oFacility) {
            // Never show calculation breakdown on the facility card.
            // Breakdown details are shown only in the popover dialog.
            return "";
        },

        /**
         * Override _getFacilityCardDetailText to hide the detail text when
         * the summary breakdown is showing a calculation (dates differ or
         * time components exist). This prevents "double breakdown" on the
         * facility card — only the calculation breakdown should appear.
         */
        _getFacilityCardDetailText: function (oFacility) {
            // If the summary text has a calculation breakdown, hide the detail text
            if (this._getFacilityCardSummaryText(oFacility)) {
                return "";
            }
            // Otherwise, fall back to parent behavior
            return BookingController.prototype._getFacilityCardDetailText.call(this, oFacility);
        },

        formatSelectedFacilitiesBreakdown: function (aFacilities) {
            if (!Array.isArray(aFacilities) || aFacilities.length === 0) {
                return "";
            }

            return aFacilities.map(function (oFacility) {
                var sName = oFacility.DisplayFacilityName || oFacility.FacilityName || "Facility";
                var sBreakdown = oFacility.BreakdownText || "";
                var sTotal = oFacility.TotalAmount !== undefined && oFacility.TotalAmount !== null
                    ? " = " + oFacility.TotalAmount + " " + (oFacility.Currency || "")
                    : "";

                return sName + (sBreakdown ? ": " + sBreakdown : "") + sTotal;
            }).join("\n");
        },

        /**
         * Find ALL matching selected facilities for a catalog facility.
         * Returns an array of matches (unlike _findSelectedFacilityForEdit which returns only one).
         * This is needed to handle facilities with multiple UnitText variants
         * (e.g., "Extra Pillow" with both "Per Day" and "Per Month" pricing).
         */
        // _findAllSelectedFacilitiesForEdit: function (oFacility, aSelectedFacilities) {
        //     aSelectedFacilities = Array.isArray(aSelectedFacilities) ? aSelectedFacilities : [];

        //     var sFacilityId = String(oFacility.ID || oFacility.FacilityID || "").trim();
        //     var sFacilityNameKey = this._normalizeEditFacilityKey(oFacility.FacilityName || oFacility.Type || "");
        //     var aMatches = [];

        //     // Try matching by catalog FacilityID first
        //     if (sFacilityId) {
        //         aSelectedFacilities.forEach(function (oSelected) {
        //             var sSelectedCatalogId = String(oSelected.CatalogFacilityID || "").trim();
        //             var sSelectedFacilityId = String(oSelected.FacilityID || oSelected.ID || "").trim();
        //             if (sSelectedCatalogId === sFacilityId || sSelectedFacilityId === sFacilityId) {
        //                 if (aMatches.indexOf(oSelected) < 0) {
        //                     aMatches.push(oSelected);
        //                 }
        //             }
        //         });
        //     }

        //     // Fall back to name matching if no ID matches found
        //     if (aMatches.length === 0 && sFacilityNameKey) {
        //         aSelectedFacilities.forEach(function (oSelected) {
        //             var sSelectedNameKey = this._normalizeEditFacilityKey(oSelected.FacilityName || oSelected.Type || "");
        //             if (sSelectedNameKey && (
        //                 sSelectedNameKey === sFacilityNameKey ||
        //                 sSelectedNameKey.indexOf(sFacilityNameKey) >= 0 ||
        //                 sFacilityNameKey.indexOf(sSelectedNameKey) >= 0
        //             )) {
        //                 if (aMatches.indexOf(oSelected) < 0) {
        //                     aMatches.push(oSelected);
        //                 }
        //             }
        //         }.bind(this));
        //     }

        //     return aMatches;
        // },

        _findAllSelectedFacilitiesForEdit: function (oFacility, aSelectedFacilities) {
            aSelectedFacilities = Array.isArray(aSelectedFacilities) ? aSelectedFacilities : [];

            var sCatalogId = String(oFacility.ID || oFacility.CatalogFacilityID || "").trim();
            var sCatalogMode = String(oFacility.SelectionMode || this._getFacilitySelectionMode(oFacility) || "")
                .trim()
                .toUpperCase();

            var fnStripUnitSuffix = function (sValue) {
                // Handles display names like "AC (Per Month)"
                return String(sValue || "").replace(/\s*\([^)]*\)\s*$/, "");
            };

            var fnKey = function (sValue) {
                return this._normalizeEditFacilityKey(fnStripUnitSuffix(sValue));
            }.bind(this);

            var aCatalogNameKeys = [
                fnKey(oFacility.FacilityName),
                fnKey(oFacility.Type)
            ].filter(function (sKey, iIndex, aList) {
                return sKey && aList.indexOf(sKey) === iIndex;
            });

            var fnGetSelectedNameKeys = function (oSelected) {
                return [
                    fnKey(oSelected.FacilityName),
                    fnKey(oSelected.Type),
                    fnKey(oSelected.DisplayFacilityName)
                ].filter(function (sKey, iIndex, aList) {
                    return sKey && aList.indexOf(sKey) === iIndex;
                });
            };

            var fnModeMatches = function (oSelected) {
                var sSelectedMode = String(oSelected.SelectionMode || "").trim().toUpperCase();

                // If old saved data has no SelectionMode, allow name/catalog match.
                // If it has SelectionMode, it must match the catalog mode.
                return !sSelectedMode || !sCatalogMode || sSelectedMode === sCatalogMode;
            };

            var fnNameMatchesExactly = function (oSelected) {
                var aSelectedNameKeys = fnGetSelectedNameKeys(oSelected);

                return aSelectedNameKeys.some(function (sSelectedKey) {
                    return aCatalogNameKeys.indexOf(sSelectedKey) >= 0;
                });
            };

            var aMatches = [];

            var fnAddMatch = function (oSelected) {
                if (aMatches.indexOf(oSelected) < 0) {
                    aMatches.push(oSelected);
                }
            };

            // 1. Strong match: selected item carries the real catalog id.
            if (sCatalogId) {
                aSelectedFacilities.forEach(function (oSelected) {
                    var sSelectedCatalogId = String(
                        oSelected.CatalogFacilityID ||
                        oSelected.CatalogID ||
                        ""
                    ).trim();

                    if (
                        sSelectedCatalogId &&
                        sSelectedCatalogId === sCatalogId &&
                        fnModeMatches(oSelected)
                    ) {
                        fnAddMatch(oSelected);
                    }
                });
            }

            // 2. Fallback: exact normalized name match + SelectionMode match.
            // No substring matching, because "AC" is inside "Laundry package".
            if (aMatches.length === 0 && aCatalogNameKeys.length > 0) {
                aSelectedFacilities.forEach(function (oSelected) {
                    if (fnModeMatches(oSelected) && fnNameMatchesExactly(oSelected)) {
                        fnAddMatch(oSelected);
                    }
                });
            }

            return aMatches;
        },
        /**
         * Build a single processed facility entry from a catalog facility and a selected facility match.
         * Extracted from _processFacilitiesForEdit to support 1:N mapping for UnitText variants.
         */
        _buildProcessedFacilityEntry: function (oFacility, oSelectedFacility, bIsSelected, bShowUnitTextSuffix) {
            var oHostelModel = this.getView().getModel("HostelModel");
            var sSelectionMode = oSelectedFacility.SelectionMode || oFacility.SelectionMode || this._getFacilitySelectionMode(oFacility);
            var bIsPersonQty = sSelectionMode === "PERSON_QTY";
            var bIsPerson = sSelectionMode === "PERSON";
            var iMinimumQty = bIsPersonQty
                ? (parseInt(oFacility.MinimumQty, 10) || 0)
                : 0;
            var fMinimumPrice = bIsPersonQty
                ? (parseFloat(oFacility.MinimumPrice) || 0)
                : 0;
            var sApiFacilityChargeType = bIsPersonQty
                ? this._normalizeFacilityChargeType(oFacility.FacilityChargeType)
                : "";
            var sSavedFacilityChargeType = bIsPersonQty
                ? this._normalizeFacilityChargeType(oSelectedFacility.FacilityChargeType || sApiFacilityChargeType)
                : "";
            var aPersonQuantities = bIsPersonQty
                ? this._buildEditFacilityPersonQuantities(oSelectedFacility)
                : (Array.isArray(oSelectedFacility.PersonQuantities)
                    ? oSelectedFacility.PersonQuantities.map(function (oLine) {
                        var oOccupant = this._resolveEditFacilityOccupant(oLine.personId, oLine.personName);
                        return {
                            personId: oOccupant ? oOccupant.id : oLine.personId,
                            personName: oOccupant ? oOccupant.name : oLine.personName,
                            qty: Math.max(parseInt(oLine.qty, 10) || 0, 0)
                        };
                    }.bind(this))
                    : []);
            var aSelectedPersonIds = (bIsPersonQty || bIsPerson)
                ? this._buildEditFacilitySelectedPersonIds(oSelectedFacility, aPersonQuantities)
                : (Array.isArray(oSelectedFacility.SelectedPersonIds) ? oSelectedFacility.SelectedPersonIds.slice() : []);
            var fSelectedPrice = bIsPersonQty
                ? fMinimumPrice
                : this._deriveEditFacilitySelectedPrice(oSelectedFacility, oFacility, sSelectionMode);
            var sSelectedPriceType = bIsPersonQty
                ? "Package Price"
                : (oSelectedFacility.SelectedPriceType || oSelectedFacility.UnitText || "Unit Price");

            // Build DisplayFacilityName: append UnitText suffix when multiple variants exist
            var sBaseName = oFacility.FacilityName || oFacility.Type || "";
            var sDisplayFacilityName = sBaseName;
            if (bShowUnitTextSuffix && sSelectedPriceType) {
                sDisplayFacilityName = sBaseName + " (" + sSelectedPriceType + ")";
            }

            return {
                FacilityID: oSelectedFacility.FacilityID || oFacility.ID,
                CatalogFacilityID: oFacility.ID,
                FacilityName: sBaseName,
                DisplayFacilityName: sDisplayFacilityName,
                Type: oFacility.Type,
                SelectionMode: sSelectionMode,
                BranchCode: oFacility.BranchCode,
                Currency: oSelectedFacility.Currency || oFacility.Currency || oHostelModel.getProperty("/Currency") || "INR",
                Image: this._getFacilityImageSource(oFacility),
                BasicFacilityPrice: this._getFirstAvailableNumber(oSelectedFacility.BasicFacilityPrice, oSelectedFacility.Price, oFacility.BasicFacilityPrice, oFacility.UnitPrice),
                UnitPrice: this._toNumber(oFacility.UnitPrice),
                PricePerHour: this._toNumber(oFacility.PerHourPrice),
                PricePerDay: this._toNumber(oFacility.PerDayPrice),
                PricePerMonth: this._toNumber(oFacility.PerMonthPrice),
                PricePerYear: this._toNumber(oFacility.PerYearPrice),
                Selected: bIsSelected,
                SelectedPrice: fSelectedPrice,
                SelectedPriceType: sSelectedPriceType,
                UnitText: sSelectedPriceType,
                ApiFacilityChargeType: sApiFacilityChargeType,
                FacilityChargeType: sSavedFacilityChargeType,
                Quantity: Math.max(parseInt(oSelectedFacility.Quantity, 10) || parseInt(oSelectedFacility.SavedQuantity, 10) || 1, 1),
                SelectedPersonIds: aSelectedPersonIds,
                PersonQuantities: aPersonQuantities,
                RawFacilityItems: Array.isArray(oSelectedFacility.RawFacilityItems)
                    ? oSelectedFacility.RawFacilityItems.map(function (oItem) {
                        return Object.assign({}, oItem);
                    })
                    : [],
                SavedTotalAmount: this._toNumber(oSelectedFacility.SavedTotalAmount),
                SavedQuantity: Math.max(parseInt(oSelectedFacility.SavedQuantity, 10) || 0, 0),
                SelectionModeLabel: this._getFacilitySelectionModeLabel(sSelectionMode),
                MinimumQty: iMinimumQty,
                MinimumPrice: fMinimumPrice,
                PackageQty: iMinimumQty,
                PackagePrice: fMinimumPrice,
                StartDate: oSelectedFacility.StartDate || null,
                EndDate: oSelectedFacility.EndDate || null,
                StartTime: oSelectedFacility.StartTime || null,
                EndTime: oSelectedFacility.EndTime || null,
                TotalHour: oSelectedFacility.TotalHour || null
            };
        },

        _processFacilitiesForEdit: function () {
            var oHostelModel = this.getView().getModel("HostelModel");
            var iExtraBed = this._toNumber(oHostelModel.getProperty("/ExtraBed"));
            var aSelectedFacilities = oHostelModel.getProperty("/AllSelectedFacilities") || [];
            var aFacilities = this._aAllFacilities || [];

            // Filter and process facilities — use reduce to allow 1:N mapping
            // when a catalog facility has multiple UnitText variants in the booking
            var aProcessedFacilities = aFacilities
                .filter(function (oFacility) {
                    if ((oFacility.Type || "").toLowerCase().trim() === "extra bed") {
                        return iExtraBed > 0;
                    }
                    return true;
                })
                .reduce(function (aResult, oFacility) {
                    // Find ALL matching selected facilities for this catalog facility
                    var aMatches = this._findAllSelectedFacilitiesForEdit(oFacility, aSelectedFacilities);

                    if (aMatches.length === 0) {
                        // No selected facilities — create one unselected card
                        aResult.push(this._buildProcessedFacilityEntry(oFacility, {}, false, false));
                        return aResult;
                    }

                    // Determine if UnitTexts differ among the matches
                    var aUniqueUnitTexts = [];
                    aMatches.forEach(function (oMatch) {
                        var sKey = String(oMatch.UnitText || oMatch.SelectedPriceType || "Unit Price").trim().toUpperCase();
                        // Normalize for comparison
                        sKey = sKey.replace(/[^A-Z0-9]/g, "");
                        if (aUniqueUnitTexts.indexOf(sKey) < 0) {
                            aUniqueUnitTexts.push(sKey);
                        }
                    });
                    var bShowSuffix = aUniqueUnitTexts.length > 1;

                    // Create one processed entry per matching selected facility
                    aMatches.forEach(function (oSelectedFacility) {
                        aResult.push(this._buildProcessedFacilityEntry(oFacility, oSelectedFacility, true, bShowSuffix));
                    }.bind(this));

                    return aResult;
                }.bind(this), []);

            this._aAllFacilities = aProcessedFacilities;
            this._syncSelectedFacilityPersonsWithOccupants();
            this._applyEditFacilityPriceFilter();
        },

        _loadFacilities: async function () {
            var oHostelModel = this.getView().getModel("HostelModel");
            var sBranchCode = oHostelModel.getProperty("/BranchCode");

            this._aAllFacilities = [];

            if (!sBranchCode) {
                this.getView().getModel("FacilityModel").setProperty("/Facilities", []);
                this._renderFacilityCards();
                return;
            }

            try {
                var oResponse = await this.ajaxReadWithJQuery("HM_Facilities", { BranchCode: sBranchCode });
                var aFacilities = oResponse && oResponse.data || [];
                this._aAllFacilities = aFacilities;
                this._processFacilitiesForEdit();
            } catch (oError) {
                console.warn("Failed to load facilities:", oError);
                this.getView().getModel("FacilityModel").setProperty("/Facilities", []);
                this._renderFacilityCards();
            }
        },

        _getDefaultBookingViewData: function () {
            return {
                showDurationSelector: true,
                showFamilySection: true,
                showBusinessTravelOption: true,
                showBusinessGSTSection: false,
                endDateEditable: true,
                editModeEnabled: false,
                isStatusNew: false,
                isAdminUpdatedYes: false,
                isWithin48HoursOfCheckIn: false,
                showEditButton: false,
                DurationOptions: [
                    { key: "1", text: "1 Month" },
                    { key: "2", text: "2 Months" },
                    { key: "3", text: "3 Months" },
                    { key: "6", text: "6 Months" },
                    { key: "12", text: "12 Months" }
                ]
            };
        },

        // Enable edit mode when "Edit booking" button is pressed
        onToggleEditUpdate: function () {
            var oBookingView = this.getView().getModel("BookingView");
            if (oBookingView && oBookingView.getProperty("/editModeEnabled")) {
                this.onSubmitPress();
            } else {
                this.onEditBookingPress();
            }
        },

        onEditBookingPress: function () {
            const oView = this.getView();

            var oBookingView = this.getView().getModel("BookingView");
            var oHostelModel = this.getView().getModel("HostelModel");
            var oFacilityModel = this.getView().getModel("FacilityModel");
            var oFacilitySelection = this.getView().getModel("FacilitySelection");

            // Create optimized backups - shallow copy for simple models, deep copy only for complex ones
            var oHostelData = oHostelModel.getData();
            var oBookingViewData = oBookingView.getData();
            var oFacilityModelData = oFacilityModel.getData();
            var oFacilitySelectionData = oFacilitySelection.getData();

            // HostelModel has nested structures, need deep copy
            this._backupHostelModel = JSON.parse(JSON.stringify(oHostelData));
            // BookingView contains nested FamilyMembers array, need deep copy for proper restoration
            this._backupBookingView = JSON.parse(JSON.stringify(oBookingViewData));
            // Facility models contain nested arrays/objects, need deep copy for proper restoration
            this._backupFacilityModel = JSON.parse(JSON.stringify(oFacilityModelData));
            this._backupFacilitySelection = JSON.parse(JSON.stringify(oFacilitySelectionData));
            // Backup _aAllFacilities array which contains selection state
            this._backupAllFacilities = JSON.parse(JSON.stringify(this._aAllFacilities || []));

            oBookingView.setProperty("/editModeEnabled", true);
        },

        // Cancel edit mode and revert to read-only
        onCancelEditPress: function () {

            MessageBox.confirm(
                "Are you sure you want to cancel? All unsaved changes will be lost.",
                {
                    title: "Confirm Cancel",

                    styleClass: "myUnifiedBtn",

                    onClose: function (sAction) {

                        if (sAction !== MessageBox.Action.OK) {
                            return;
                        }

                        this._performCancelEdit();

                    }.bind(this)
                }
            );
        },

        _performCancelEdit: function () {
            var oBookingView = this.getView().getModel("BookingView");
            var oHostelModel = this.getView().getModel("HostelModel");
            var oFacilityModel = this.getView().getModel("FacilityModel");
            var oFacilitySelection = this.getView().getModel("FacilitySelection");

            // Restore original data from backup if it exists
            if (this._backupHostelModel) {
                // JSON.stringify converts Date objects to strings; restore TodayDate as a real Date
                // BEFORE calling setData so that DatePicker's minDate binding never sees a string
                var oBackupData = Object.assign({}, this._backupHostelModel);
                var vTodayDate = oBackupData.TodayDate;
                if (vTodayDate && !(vTodayDate instanceof Date)) {
                    oBackupData.TodayDate = new Date(vTodayDate);
                }
                oHostelModel.setData(oBackupData);
            }
            if (this._backupBookingView) {
                oBookingView.setData(Object.assign({}, this._backupBookingView));
            }
            if (this._backupFacilityModel) {
                oFacilityModel.setData(this._backupFacilityModel);
            }
            if (this._backupFacilitySelection) {
                oFacilitySelection.setData(this._backupFacilitySelection);
            }
            // Restore _aAllFacilities array which contains selection state
            if (this._backupAllFacilities) {
                this._aAllFacilities = JSON.parse(JSON.stringify(this._backupAllFacilities));
            }

            // Apply facility price filter to ensure facility model is properly synced with _aAllFacilities
            // This updates the FacilityModel's /Facilities array with correct Selected state and prices
            this._applyEditFacilityPriceFilter();

            // Reset facility carousel to first page
            this._iFacilityStartIndex = 0;

            // Re-render facility cards and sync with occupants
            this._renderFacilityCards();
            this._syncSelectedFacilityPersonsWithOccupants();

            // Ensure edit mode is disabled
            oBookingView.setProperty("/editModeEnabled", false);

            if (this._sReturnRouteAfterEdit === "RouteMyBookings") {
                this._resetBookingPageModels();
                this._navAfterEditBooking();
            }
        },

        _hydrateAppliedCouponData: async function () {
            var oHostelModel = this.getView().getModel("HostelModel");
            var sCouponCode = String(oHostelModel.getProperty("/AppliedCouponCode") || "").trim();
            var sBranchCode = String(oHostelModel.getProperty("/BranchCode") || "").trim();

            if (!sCouponCode) {
                oHostelModel.setProperty("/AppliedCouponData", null);
                return null;
            }

            try {
                var oResponse = await this.ajaxReadWithJQuery("HM_CouponBookingCount", {
                    CouponCode: sCouponCode,
                    Status: "Active"
                });
                var aCoupons = oResponse && oResponse.data || [];
                var oMatchedCoupon = aCoupons.find(function (oCoupon) {
                    var sCouponBranchCode = String(oCoupon.BranchCode || "").trim();
                    return String(oCoupon.CouponCode || "").toUpperCase() === sCouponCode.toUpperCase()
                        && sCouponBranchCode === sBranchCode;
                }) || null;

                oHostelModel.setProperty("/AppliedCouponData", oMatchedCoupon);
                return oMatchedCoupon;
            } catch (oError) {
                oHostelModel.setProperty("/AppliedCouponData", null);
                return null;
            }
        },

        _resetCouponState: function (bKeepTypedValue) {
            BookingController.prototype._resetCouponState.call(this, bKeepTypedValue);
        },

        // Override facility card press - allow popover to open in read-only mode too
        onFacilityCardPress: function (oFacility, oCard, oEvent) {
            var oBookingView = this.getView().getModel("BookingView");
            var oSelectionModel = this.getView().getModel("FacilitySelection");
            var bEditModeEnabled = oBookingView ? oBookingView.getProperty("/editModeEnabled") : false;

            // Store edit mode state in selection model so popover controls can be disabled
            if (oSelectionModel) {
                oSelectionModel.setProperty("/editModeEnabled", bEditModeEnabled);
            }

            // Always call parent method to open the popover (which calls _openFacilitySelectionDialog -> setData() replacing ALL model data)
            sap.ui.com.project1.controller.Booking.prototype.onFacilityCardPress.call(this, oFacility, oCard, oEvent);

            // Set facilityBreakdown AFTER parent setData() so it isnt wiped out
            if (oSelectionModel) {
                oSelectionModel.setProperty("/facilityBreakdown", this._buildFacilityCalcBreakdown(oFacility));
            }
        },

        /**
         * Show calculation breakdown only for condition 2:
         * AdminUpdated = "YES" AND (dates differ from booking OR explicit StartTime/EndTime values).
         */
        _shouldShowFacilityCalcBreakdown: function (oFacility) {
            if (!oFacility || !oFacility.Selected) {
                return false;
            }

            var oBookingView = this.getView().getModel("BookingView");
            var bIsAdminUpdatedYes = oBookingView ? oBookingView.getProperty("/isAdminUpdatedYes") : false;
            if (!bIsAdminUpdatedYes) {
                return false;
            }

            // Condition 2 per-facility: dates differ or has explicit time values
            if (this._isBookingDateDependentFacility(oFacility)) {
                return false;
            }

            return true;
        },

        /**
         * Build a structured calculation breakdown for a facility item
         * shown in the popover dialog as a compact invoice-style list.
         * Returns { hasBreakdown: Boolean, items: Array, grandTotal: String, currency: String }
         * Each item: { personName, tag, dateRange, math, subtotal }
         */
        _buildFacilityCalcBreakdown: function (oFacility) {
            if (!oFacility || !oFacility.Selected) {
                return { hasBreakdown: false, items: [], grandTotal: "₹0.00", currency: "INR" };
            }

            if (!this._shouldShowFacilityCalcBreakdown(oFacility)) {
                return { hasBreakdown: false, items: [], grandTotal: "0.00", currency: oFacility.Currency || "INR" };
            }

            var sSelectionMode = oFacility.SelectionMode || this._getFacilitySelectionMode(oFacility);
            var oHostelModel = this.getView().getModel("HostelModel");
            var sBookingStart = oHostelModel ? oHostelModel.getProperty("/StartDate") : "";
            var sBookingEnd = oHostelModel ? oHostelModel.getProperty("/EndDate") : "";
            var sCurrency = oFacility.Currency || (oHostelModel ? oHostelModel.getProperty("/Currency") : "INR") || "INR";
            var sFacilityTag = oFacility.DisplayFacilityName || oFacility.FacilityName || oFacility.Type || "";

            // Resolve facility-specific dates (from RawFacilityItems or facility itself, fallback to booking)
            var sFacStart, sFacEnd, sFacStartTime, sFacEndTime, sFacTotalHour;
            if (Array.isArray(oFacility.RawFacilityItems) && oFacility.RawFacilityItems.length > 0) {
                var oFirstRaw = oFacility.RawFacilityItems[0];
                sFacStart = oFirstRaw.StartDate || oFacility.StartDate || sBookingStart || null;
                sFacEnd = oFirstRaw.EndDate || oFacility.EndDate || sBookingEnd || null;
                sFacStartTime = oFirstRaw.StartTime || oFacility.StartTime || null;
                sFacEndTime = oFirstRaw.EndTime || oFacility.EndTime || null;
                sFacTotalHour = oFirstRaw.TotalHour || oFacility.TotalHour || null;
            } else {
                sFacStart = oFacility.StartDate || sBookingStart || null;
                sFacEnd = oFacility.EndDate || sBookingEnd || null;
                sFacStartTime = oFacility.StartTime || null;
                sFacEndTime = oFacility.EndTime || null;
                sFacTotalHour = oFacility.TotalHour || null;
            }

            // Format date for compact display (DD/MM)
            var fnFormatDateShort = function (s) {
                if (!s) { return ""; }
                var d = new Date(s);
                if (!isNaN(d.getTime())) {
                    var dd = String(d.getDate()).padStart(2, "0");
                    var mm = String(d.getMonth() + 1).padStart(2, "0");
                    return dd + "/" + mm;
                }
                return String(s).replace(/T.*$/, "").trim();
            };

            var sDateRange = "";
            if (sFacStart && sFacEnd) {
                sDateRange = fnFormatDateShort(sFacStart) + " To " + fnFormatDateShort(sFacEnd);
            } else if (sFacStart) {
                sDateRange = fnFormatDateShort(sFacStart);
            } else if (sFacEnd) {
                sDateRange = fnFormatDateShort(sFacEnd);
            }

            var aItems = [];
            var fGrandTotal = 0;

            // ── PERSON / PERSON_QTY modes ──
            if (sSelectionMode === "PERSON" || sSelectionMode === "PERSON_QTY") {
                fGrandTotal = this._getFacilityCardTotalAmount(oFacility);
                var aOccupants = this._getEditFacilityOccupants
                    ? this._getEditFacilityOccupants()
                    : (this._getOccupantOptions ? this._getOccupantOptions() : []);
                var oPerPersonResult = this._calculatePerPersonTotal(oFacility, aOccupants);

                if (oPerPersonResult.personBreakdown.length > 0) {
                    oPerPersonResult.personBreakdown.forEach(function (oPerson) {
                        var sPersonDateRange = "";
                        if (oPerson.startDate && oPerson.endDate) {
                            sPersonDateRange = fnFormatDateShort(oPerson.startDate) + " To " + fnFormatDateShort(oPerson.endDate);
                        } else if (oPerson.startDate) {
                            sPersonDateRange = fnFormatDateShort(oPerson.startDate);
                        } else if (oPerson.endDate) {
                            sPersonDateRange = fnFormatDateShort(oPerson.endDate);
                        }

                        var sMath = "";
                        if (sSelectionMode === "PERSON") {
                            var sUnitLabel = "";
                            var sUnitKey = (oPerson.priceType || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
                            if (sUnitKey === "PERDAY") { sUnitLabel = Math.max(oPerson.dayCount, 1) + "Day(s)"; }
                            else if (sUnitKey === "PERMONTH") { sUnitLabel = Math.max(oPerson.monthCount, 1) + "Mos"; }
                            else if (sUnitKey === "PERYEAR") { sUnitLabel = Math.max(oPerson.yearCount, 1) + "Yrs"; }
                            else if (sUnitKey === "PERHOUR") { sUnitLabel = Math.max(oPerson.dayCount, 1) + "Day(s) × " + Math.max(oPerson.hourCount, 1) + "Hr(s)"; }
                            else { sUnitLabel = "× 1"; }
                            sMath = "₹" + oPerson.price.toFixed(2) + " × " + sUnitLabel;
                        } else {
                            // PERSON_QTY
                            if (oPerson.chargeType === "DAILY") {
                                sMath = "₹" + oPerson.packagePrice.toFixed(2) + " × " + Math.max(oPerson.dayCount, 1) + " Days";
                            } else if (oPerson.chargeType === "Entire Booking") {
                                sMath = "₹" + oPerson.packagePrice.toFixed(2) + " × 1";
                            } else {
                                sMath = "₹" + oPerson.packagePrice.toFixed(2) + " × " + oPerson.quantity;
                            }
                        }

                        aItems.push({
                            personName: oPerson.personName,
                            tag: "",
                            dateRange: sPersonDateRange || sDateRange,
                            math: sMath,
                            subtotal: "₹" + oPerson.personTotal.toFixed(2)
                        });
                    }.bind(this));
                }
            } else {
                // ── SINGLE / QTY modes ──
                fGrandTotal = this._getFacilityCardTotalAmount(oFacility);
                var fPrice = this._getFirstAvailableNumber(oFacility.SelectedPrice, oFacility.CurrentPrice, oFacility.BasicFacilityPrice);
                var sPriceType = oFacility.SelectedPriceType || oFacility.CurrentPriceType || "Unit Price";
                var iQuantity = Math.max(parseInt(oFacility.Quantity, 10) || 1, 1);
                var iDayCount = this._getDayCount(sFacStart, sFacEnd);
                var iMonthCount = this._getMonthCount(sFacStart, sFacEnd);
                var iYearCount = this._getYearCount(sFacStart, sFacEnd);
                var iHourCount = this._getHourCount(sFacStart, sFacEnd, sFacStartTime, sFacEndTime, sFacTotalHour);

                var sUnitKey = sPriceType.toUpperCase().replace(/[^A-Z0-9]/g, "");
                var sMath = "";

                if (sUnitKey === "PERHOUR") {
                    sMath = "₹" + fPrice.toFixed(2) + " × " + Math.max(iDayCount, 1) + "Day(s) × " + Math.max(iHourCount, 1) + "Hr(s)";
                } else if (sUnitKey === "PERDAY") {
                    sMath = "₹" + fPrice.toFixed(2) + " × " + Math.max(iDayCount, 1) + " Days";
                } else if (sUnitKey === "PERMONTH") {
                    sMath = "₹" + fPrice.toFixed(2) + " × " + Math.max(iMonthCount, 1) + " Mos";
                } else if (sUnitKey === "PERYEAR") {
                    sMath = "₹" + fPrice.toFixed(2) + " × " + Math.max(iYearCount, 1) + " Yrs";
                } else if (sUnitKey === "UNITPRICE" || sUnitKey === "UNIT") {
                    sMath = "₹" + fPrice.toFixed(2);
                } else if (sUnitKey === "PACKAGEPRICE" || sUnitKey === "PACKAGE") {
                    var sChargeType = String(oFacility.FacilityChargeType || "").toUpperCase();
                    if (sChargeType === "DAILY") {
                        sMath = "₹" + fPrice.toFixed(2) + " × " + Math.max(iDayCount, 1) + " Days";
                    } else {
                        sMath = "₹" + fPrice.toFixed(2) + " (once)";
                    }
                } else {
                    sMath = "₹" + fPrice.toFixed(2);
                }

                if (iQuantity > 1) {
                    sMath += " × " + iQuantity + " Qty";
                }

                // For SINGLE/QTY, use facility name as the personName and tag
                var sDisplayName = sFacilityTag || "Facility";
                aItems.push({
                    personName: sDisplayName,
                    tag: sSelectionMode === "QTY" ? "×" + iQuantity : "",
                    dateRange: sDateRange,
                    math: sMath,
                    subtotal: "₹" + fGrandTotal.toFixed(2)
                });
            }

            return {
                hasBreakdown: aItems.length > 0,
                items: aItems,
                grandTotal: "₹" + fGrandTotal.toFixed(2),
                currency: sCurrency
            };
        },

        /**
         * Override _getFacilitySelectionDialog to inject a compact invoice-style
         * calculation breakdown list into the popover content, visible only when
         * facility dates differ from booking dates or time components exist.
         */
        _getFacilitySelectionDialog: function () {
            var oDialog = sap.ui.com.project1.controller.Booking.prototype._getFacilitySelectionDialog.call(this);

            // Inject the breakdown section only once
            if (!this._bFacilityBreakdownInjected && oDialog) {
                var aContent = oDialog.getContent();
                if (aContent && aContent.length > 0) {
                    var oVBox = aContent[0];
                    if (oVBox && oVBox.addItem) {
                        // Thin separator
                        oVBox.addItem(
                            new sap.m.ToolbarSpacer({ height: "0.25rem" })
                        );
                        // Compact invoice-style calculation breakdown
                        oVBox.addItem(
                            new sap.m.VBox({
                                visible: "{= !!${FacilitySelection>/facilityBreakdown/hasBreakdown} }",
                                items: [
                                    // Section header
                                    new sap.m.Text({
                                        text: "Calculation"
                                    }).addStyleClass("calcSectionHeader"),
                                    // Person/item rows
                                    new sap.m.List({
                                        showNoData: false,
                                        showSeparators: "Inner",
                                        items: {
                                            path: "FacilitySelection>/facilityBreakdown/items",
                                            template: new sap.m.CustomListItem({
                                                content: [
                                                    new sap.m.VBox({
                                                        width: "100%",
                                                        items: [
                                                            // Line 1: Name (wraps) + sap-icon://date-time + "From date" (continuous inline)
                                                            new sap.m.HBox({
                                                                alignItems: "Center",
                                                                items: [
                                                                    new sap.m.Text({
                                                                        text: "{FacilitySelection>personName}",
                                                                        wrapping: true
                                                                    }).addStyleClass("calcPersonName"),
                                                                    new sap.ui.core.Icon({
                                                                        src: "sap-icon://date-time",
                                                                        size: "0.875rem"
                                                                    }).addStyleClass("calcDateIcon"),
                                                                    new sap.m.Text({
                                                                        text: "{= 'From ' + ${FacilitySelection>dateRange} }"
                                                                    }).addStyleClass("calcDateRange")
                                                                ]
                                                            }),
                                                            // Line 2: math (left, near-black) + subtotal (right, teal)
                                                            new sap.m.HBox({
                                                                width: "100%",
                                                                justifyContent: "SpaceBetween",
                                                                alignItems: "Center",
                                                                items: [
                                                                    new sap.m.Text({
                                                                        text: "{FacilitySelection>math}"
                                                                    }).addStyleClass("calcMath"),
                                                                    new sap.m.Text({
                                                                        text: "{FacilitySelection>subtotal}"
                                                                    }).addStyleClass("calcSubtotal")
                                                                ]
                                                            })
                                                        ]
                                                    })
                                                ]
                                            }).addStyleClass("calcListItem")
                                        }
                                    }).addStyleClass("calcItemList")
                                ]
                            }).addStyleClass("calcBreakdownSection")
                        );
                    }
                }
                this._bFacilityBreakdownInjected = true;
            }

            return oDialog;
        },

        // Override the nav back to return to the source page
        onNavBack: function () {
            var oBookingView = this.getView().getModel("BookingView");
            var bEditModeEnabled = oBookingView && oBookingView.getProperty("/editModeEnabled");

            var sMessage = bEditModeEnabled
                ? "Do you really want to go back? All saved changes will be lost"
                : "Do you want to go back?";

            MessageBox.warning(
                sMessage,
                {
                    actions: [MessageBox.Action.CANCEL, MessageBox.Action.OK],
                    emphasizedAction: MessageBox.Action.OK,
                    styleClass: "myUnifiedBtn",
                    onClose: function (sAction) {
                        if (sAction !== MessageBox.Action.OK) {
                            return;
                        }
                        this._resetBookingPageModels();
                        this._navAfterEditBooking();
                    }.bind(this)
                }
            );
        },

        _getDefaultFacilityData: function () {
            return {
                Facilities: []
            };
        },

        _getDefaultFacilitySelectionData: function () {
            return {
                selectedFacilities: [],
                editModeEnabled: false
            };
        },

        _getDefaultPaymentData: function () {
            return {
                Amount: 0,
                PayableNow: 0,
                RemainingBalance: 0,
                PaymentType: "PayOnCheckIn",
                PaymentDate: "",
                BankTransactionID: ""
            };
        },

        // Override to prevent making date pickers read-only (they're controlled by editModeEnabled binding)
        _makeDatePickersReadOnly: function (aIds) {
            // Do nothing - date pickers are controlled by enabled/editable bindings
            // based on editModeEnabled property
        },

        onGeneratePDF: async function (data) {
            const booking = data.Booking?.[0] || {};
            const facilities = data.FacilityItems || [];
            const oHostelModel = this.getView().getModel("HostelModel").getData() || {};

            let filter = { BranchID: [booking.BranchCode] };
            const oCompanyDetailsModel = await this.ajaxReadWithJQuery("HM_Branch", filter);
            const company = oCompanyDetailsModel.data[0] || {};
            const checkinTime = company.CheckinTime || "11:00 AM";
            const checkoutTime = company.CheckoutTime || "10:00 PM";

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4"
            });

            const currency = (booking.Currency || "INR").trim();
            let currentY = 15;

            const PRIMARY_COLOR = [20, 170, 183];
            const ACCENT_COLOR = [244, 185, 66];
            const LIGHT_GRAY = [245, 245, 245];
            const BORDER_LIGHT = [230, 230, 230];

            const checkNewPage = (requiredSpace = 20) => {
                if (currentY + requiredSpace > 280) {
                    doc.addPage();
                    currentY = 20;
                    return true;
                }
                return false;
            };

            // ========== HEADER SECTION ==========
            doc.setFillColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
            doc.rect(0, 0, 210, 32, "F");

            doc.setFillColor(ACCENT_COLOR[0], ACCENT_COLOR[1], ACCENT_COLOR[2]);
            doc.rect(0, 32, 210, 2.5, "F");

            // Title
            doc.setFont("helvetica", "bold");
            doc.setFontSize(24);
            doc.setTextColor(255, 255, 255);
            doc.text("BOOKING VOUCHER", 20, 20);

            // Compact Right Box
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(255, 255, 255);
            doc.roundedRect(145, 9, 45, 10, 3, 3, "FD");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(...PRIMARY_COLOR);
            doc.text(`Booked On: ${oHostelModel.BookingDate ? Formatter.formatDate(oHostelModel.BookingDate) : "N/A"}`, 148, 15);

            currentY = 40;

            // ================= PROPERTY =================
            checkNewPage(50);

            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(ACCENT_COLOR[0], ACCENT_COLOR[1], ACCENT_COLOR[2]);
            doc.setLineWidth(0.5);
            doc.roundedRect(15, currentY, 180, 45, 5, 5, "FD");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
            doc.text(company.Name || "StayVriksha", 20, currentY + 10);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            let address = doc.splitTextToSize(company.Address || "Kalpavriksha Karekal layout, Near, Railway Bridge, Kalaburagi, Karnataka", 130);
            doc.text(address, 20, currentY + 18);

            let contactY = currentY + 18 + (address.length * 4);
            doc.setTextColor(100, 100, 100);
            doc.text(`Contact: ${company.Contact || "9122333333"}`, 20, contactY);
            doc.text(`Email: ${company.EmailID || "contact@pskhostel.com"}`, 20, contactY + 5);

            if (company.GeoLocation) {
                doc.setTextColor(ACCENT_COLOR[0], ACCENT_COLOR[1], ACCENT_COLOR[2]);
                doc.textWithLink("View Property on Map", 20, contactY + 10, {
                    url: company.GeoLocation
                });
            }

            currentY += 55;

            // ================= GUEST & STAY =================
            checkNewPage(45);

            let guestBoxY = currentY;
            var Memberdata = this.getView().getModel("BookingView").getProperty("/FamilyMembers") || [];
            let guestBody = [];

            Memberdata.forEach((member, index) => {
                guestBody.push([
                    (index + 1).toString(),
                    `${member.Salutation || ""} ${member.Name || "-"}`,
                    member.Gender || "-",
                    Formatter.formatAgeFromDOBOrAge(member.Age) || "-",
                    member.Relation || "-"
                ]);
            });

            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(...PRIMARY_COLOR);
            doc.text("GUEST DETAILS", 24, guestBoxY + 8);

            doc.autoTable({
                startY: guestBoxY + 12,
                margin: { left: 20, right: 15 },
                head: [["Sl.No", "Guest Name", "Gender", "Age", "Relation"]],
                body: guestBody,
                theme: "grid",
                styles: {
                    font: "helvetica",
                    fontSize: 8,
                    cellPadding: 2,
                    lineColor: [220, 220, 220],
                    lineWidth: 0.1
                },
                headStyles: {
                    fillColor: PRIMARY_COLOR,
                    textColor: [255, 255, 255],
                    fontStyle: "bold",
                    halign: "center"
                },
                columnStyles: {
                    0: { cellWidth: 15, halign: "center" },
                    1: { cellWidth: 'auto' },
                    2: { cellWidth: 25, halign: "center" },
                    3: { cellWidth: 25, halign: "center" },
                    4: { cellWidth: 30, halign: "center" }
                }
            });

            // Dynamic Box Height over-render handling
            let guestBoxHeight = (doc.lastAutoTable.finalY - guestBoxY) + 10;
            doc.setFillColor(LIGHT_GRAY[0], LIGHT_GRAY[1], LIGHT_GRAY[2]);
            doc.setDrawColor(BORDER_LIGHT[0], BORDER_LIGHT[1], BORDER_LIGHT[2]);
            doc.roundedRect(15, guestBoxY, 180, guestBoxHeight, 4, 4, "S");

            // Colored Side Bar Accent
            doc.setFillColor(ACCENT_COLOR[0], ACCENT_COLOR[1], ACCENT_COLOR[2]);
            doc.rect(15, guestBoxY, 5, guestBoxHeight, "F");

            currentY = guestBoxY + guestBoxHeight + 12;

            // ---------- STAY DETAILS (DYNAMICALLY CALCULATED) ----------
            checkNewPage(45);

            let stayStartY = currentY;

            // Text offset placements relative to stayStartY
            let titleOffset = 10;
            let row1Offset = 22;
            let row2Offset = 34;

            // Calculate dynamic container boundary height based on the final row offset
            let stayCardHeight = row2Offset + 8;

            doc.setFillColor(...LIGHT_GRAY);
            doc.setDrawColor(...BORDER_LIGHT);
            doc.roundedRect(15, stayStartY, 180, stayCardHeight, 4, 4, "FD");

            doc.setFillColor(...ACCENT_COLOR);
            doc.rect(15, stayStartY, 5, stayCardHeight, "F");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(...PRIMARY_COLOR);
            doc.text("STAY DETAILS", 24, stayStartY + titleOffset);

            // Row 1 Fields
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(90, 90, 90);
            doc.text("Check-in Date", 24, stayStartY + row1Offset);
            doc.text("Room Type", 115, stayStartY + row1Offset);

            doc.setFont("helvetica", "normal");
            doc.setTextColor(50, 50, 50);
            doc.text(booking.StartDate ? Formatter.formatDate(booking.StartDate) : "-", 60, stayStartY + row1Offset);
            doc.text(booking.BedType || "-", 150, stayStartY + row1Offset);

            // Row 2 Fields
            doc.setFont("helvetica", "bold");
            doc.setTextColor(90, 90, 90);
            doc.text("Check-out Date", 24, stayStartY + row2Offset);
            doc.text("No Of Guests", 115, stayStartY + row2Offset);

            doc.setFont("helvetica", "normal");
            doc.setTextColor(50, 50, 50);
            doc.text(booking.EndDate ? Formatter.formatDate(booking.EndDate) : "-", 60, stayStartY + row2Offset);
            doc.text(String(booking.NoOfPersons || "-"), 150, stayStartY + row2Offset);

            // Baseline spacing derived dynamically from computed layout card structure
            currentY = stayStartY + stayCardHeight + 12;

            // ================= FACILITY DETAILS =================
            if (facilities.length > 0) {
                if (currentY + 20 > 280) {
                    doc.addPage();
                    currentY = 20;
                }

                doc.setFont("helvetica", "bold");
                doc.setFontSize(14);
                doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
                doc.text("FACILITY DETAILS", 15, currentY);

                doc.setDrawColor(ACCENT_COLOR[0], ACCENT_COLOR[1], ACCENT_COLOR[2]);
                doc.setLineWidth(0.8);
                doc.line(15, currentY + 3, 70, currentY + 3);

                currentY += 8;

                let tableBody = facilities.map((item, index) => {

                    let sUnitText = item.UnitText || "-";

                    if (item.StartDate && item.EndDate) {
                        const startDate = new Date(item.StartDate);
                        const endDate = new Date(item.EndDate);

                        // Difference in days (inclusive)
                        const diffDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

                        if (sUnitText === "Unit Price" || sUnitText === "Package Price") {
                            sUnitText = `${sUnitText} (${item.Quantity || 1} Qty)`;
                        } else if (sUnitText === "Per Day") {
                            sUnitText = `${sUnitText} (${diffDays} Days)`;
                        } else if (sUnitText === "Per Month") {
                            const months =
                                (endDate.getFullYear() - startDate.getFullYear()) * 12 +
                                (endDate.getMonth() - startDate.getMonth());

                            sUnitText = `${sUnitText}\n(${months} Month${months > 1 ? "s" : ""})`;
                        } else if (sUnitText === "Per Year") {
                            const years = endDate.getFullYear() - startDate.getFullYear();

                            sUnitText = `${sUnitText}\n(${years} Year${years > 1 ? "s" : ""})`;
                        }
                    }

                    return [
                        (index + 1).toString(),
                        item.FacilityName || "-",
                        Formatter.formatDate(item.StartDate) || "-",
                        Formatter.formatDate(item.EndDate) || "-",
                        Formatter.fromatNumber(parseFloat(item.BasicFacilityPrice) || 0),
                        sUnitText,
                        Formatter.fromatNumber(parseFloat(item.FacilitiPrice) || 0)
                    ];
                });

                doc.autoTable({
                    startY: currentY,
                    margin: { left: 15, right: 15 },
                    head: [['Sl.No', 'Particular', 'Start Date', 'End Date', 'Gross Price', 'Unit', 'Total']],
                    body: tableBody,
                    theme: 'striped',
                    styles: {
                        font: "helvetica",
                        fontSize: 9,
                        cellPadding: 2,
                        lineColor: [220, 220, 220],
                        lineWidth: 0.1,
                        valign: "middle"
                    },
                    headStyles: {
                        fillColor: PRIMARY_COLOR,
                        textColor: [255, 255, 255],
                        fontStyle: "bold",
                        fontSize: 10,
                        halign: "center"
                    },
                    columnStyles: {
                        0: { cellWidth: 14, halign: "center" },
                        1: { cellWidth: 'auto', halign: "left" },
                        2: { cellWidth: 24, halign: "center" },
                        3: { cellWidth: 24, halign: "center" },
                        4: { cellWidth: 24, halign: "right" },
                        5: { cellWidth: 20, halign: "center" },
                        6: { cellWidth: 28, halign: "right" }
                    }
                });

                currentY = doc.lastAutoTable.finalY + 12;
            }

            // ========== PAYMENT SUMMARY (DYNAMICALLY CALCULATED) ==========
            const roomRent = parseFloat(oHostelModel.RoomPrice) || 0;
            const facilityTotal = parseFloat(oHostelModel.TotalFacilityPrice) || 0;
            const subTotal = roomRent + facilityTotal;
            const discount = parseFloat(booking.Discount) || 0;
            let grandTotal = oHostelModel.GrandTotal;

            const hasCGST = booking.GSTType === "CGST/SGST";
            const hasIGST = booking.GSTType === "IGST";

            // Calculate unique lines to isolate precise box height requirements
            let linesCount = 4 + (hasCGST ? 2 : hasIGST ? 1 : 0) + (discount > 0 ? 1 : 0);
            let paymentBoxHeight = (linesCount * 7) + 25;

            if (currentY + paymentBoxHeight > 280) {
                doc.addPage();
                currentY = 20;
            }

            let paymentStartY = currentY;

            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(244, 185, 66);
            doc.setLineWidth(0.3);
            doc.roundedRect(15, paymentStartY, 180, paymentBoxHeight, 4, 4, "FD");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(13);
            doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
            doc.text("PAYMENT SUMMARY", 20, paymentStartY + 10);

            let summaryY = paymentStartY + 20;
            const leftX = 20;
            const rightX = 185;

            const addLine = (label, value, isGrandTotal = false) => {
                if (isGrandTotal) {
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(12);
                    doc.setTextColor(ACCENT_COLOR[0], ACCENT_COLOR[1], ACCENT_COLOR[2]);
                } else {
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(10);
                    doc.setTextColor(80, 80, 80);
                }

                doc.text(label, leftX, summaryY);
                doc.text(value, rightX, summaryY, { align: "right" });
                summaryY += 7;
            };

            addLine("Room Rent", ` ${Formatter.fromatNumber(roomRent)}`);

            // Render Facility Total row line only if there's actual value or entries
            if (facilityTotal > 0 || facilities.length > 0) {
                addLine("Facilities", ` ${Formatter.fromatNumber(facilityTotal)}`);
            }

                if (discount > 0) {
                addLine("Discount", `-  ${Formatter.fromatNumber(discount)}`);
                }

                const finalSubTotal = Number(subTotal) - Number(discount);


                 addLine("Sub Total", ` ${Formatter.fromatNumber(finalSubTotal)}`);

           

            if (hasCGST) {
                const cgst = parseFloat(oHostelModel.CGST) || 0;
                const sgst = parseFloat(oHostelModel.SGST) || 0;
                addLine(`CGST (${oHostelModel.GSTValue}%)`, ` ${Formatter.fromatNumber(cgst)}`);
                addLine(`SGST (${oHostelModel.GSTValue}%)`, ` ${Formatter.fromatNumber(sgst)}`);
            } else if (hasIGST) {
                const igst = parseFloat(oHostelModel.IGST) || 0;
                addLine(`IGST (${oHostelModel.GSTValue}%)`, ` ${Formatter.fromatNumber(igst)}`);
            }

           

            summaryY += 1;
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.3);
            doc.line(leftX, summaryY - 3, rightX, summaryY - 3);

            summaryY += 2;
            addLine("GRAND TOTAL", ` ${Formatter.fromatNumber(grandTotal)}`, true);

            currentY = paymentStartY + paymentBoxHeight + 12;

            // ========== AMOUNT IN WORDS ==========
            if (currentY + 30 > 280) {
                doc.addPage();
                currentY = 20;
            }

            doc.setFillColor(LIGHT_GRAY[0], LIGHT_GRAY[1], LIGHT_GRAY[2]);
            doc.setDrawColor(BORDER_LIGHT[0], BORDER_LIGHT[1], BORDER_LIGHT[2]);
            doc.roundedRect(15, currentY, 180, 20, 4, 4, "FD");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
            doc.text("Amount in Words:", 20, currentY + 8);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            const words = await this.convertNumberToWords(grandTotal, currency);
            const wrappedWords = doc.splitTextToSize(words || "Zero Rupees Only", 160);
            doc.text(wrappedWords, 20, currentY + 15);

            currentY += 28;

            // ========== IMPORTANT INFORMATION ==========
            if (currentY + 50 > 280) {
                doc.addPage();
                currentY = 20;
            }

            doc.setFillColor(255, 250, 240);
            doc.setDrawColor(ACCENT_COLOR[0], ACCENT_COLOR[1], ACCENT_COLOR[2]);
            doc.roundedRect(15, currentY, 180, 40, 4, 4, "FD");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
            doc.text("IMPORTANT INFORMATION", 20, currentY + 8);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);

            const infoItems = [
                "• Valid government ID required at check-in (Aadhaar, Passport, Driver's License)",
                "• GST invoice available at the property upon request",
                `• Check-in: ${checkinTime} | Check-out: ${checkoutTime}`,
                "• Early check-in/late check-out subject to availability"
            ];

            let infoY = currentY + 16;
            infoItems.forEach((item) => {
                doc.text(item, 20, infoY);
                infoY += 5;
            });

            currentY += 48;

            // ========== FOOTER ==========
            if (currentY + 15 > 280) {
                doc.addPage();
                currentY = 20;
            }

            doc.setDrawColor(ACCENT_COLOR[0], ACCENT_COLOR[1], ACCENT_COLOR[2]);
            doc.setLineWidth(0.3);
            doc.line(15, currentY, 195, currentY);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(120, 120, 120);
            doc.text("Thank you for choosing us! We look forward to hosting you.", 15, currentY + 5);

            doc.setTextColor(ACCENT_COLOR[0], ACCENT_COLOR[1], ACCENT_COLOR[2]);
            doc.text("Premium Hospitality Experience", 195, currentY + 5, { align: "right" });

            return doc.output("datauristring").split(",")[1];
        },

        onpressLogin: function () {
            if (!this._oSignDialog) {
                this._oSignDialog = sap.ui.xmlfragment("sap.ui.com.project1.fragment.SignInSignup", this);
                this.getView().addDependent(this._oSignDialog);
                this._oSignDialog.addStyleClass("authDialog"); // Add our custom style class
                this._oSignDialog.attachAfterClose(this._resetAuthDialog, this);
            }
            // COMPLETE reset of all auth-related states
            this.oViewModel.setProperty("/authFlow", "signin");
            this.oViewModel.setProperty("/loginMode", "password");
            this.oViewModel.setProperty("/showOTPField", false);
            this.oViewModel.setProperty("/isOtpEntered", false);

            // 🔥 FIX: You forgot these
            this.oViewModel.setProperty("/isOtpSelected", false);
            this.oViewModel.setProperty("/isPasswordSelected", true);

            // Reset fields
            this._resetAllAuthFields?.();
            this._clearAllAuthFields?.();

            // Reset OTP UI
            const otpCtrl = $C("signInOTP");
            if (otpCtrl) {
                otpCtrl.setValue("");
                otpCtrl.setEnabled(false);
            }

            const btnSendOTP = $C("btnSignInSendOTP");
            if (btnSendOTP) btnSendOTP.setVisible(false);

            // Reset password valid state
            const passCtrl = $C("signinPassword");
            if (passCtrl) {
                passCtrl.setEnabled(true);
                passCtrl.setValue("");
                passCtrl.setValueState("None");
            }

            // Reset dialog title
            this.oViewModel.setProperty("/dialogTitle", "Sign In");
            // this.getView().addStyleClass("blur-background");
            this._oSignDialog.open();
        },

        // Signin section

        onSignIn: async function () {
            var oView = this.getView();
            var vm = oView.getModel("LoginViewModel");
            var oFragment = this._oLoginAlertDialog;

            const isOTP = true; // since you only use OTP now

            // Fragment controls (IMPORTANT: fragment ID must match load ID)
            const ctrlEmailId = sap.ui.core.Fragment.byId(
                this.createId("LoginAlertDialog"),
                "emailInput"
            );

            const ctrlOTP = sap.ui.core.Fragment.byId(
                this.createId("LoginAlertDialog"),
                "otpInput"
            );

            const sEmail = ctrlEmailId?.getValue()?.trim();
            const sOTP = ctrlOTP?.getValue()?.trim();

            // ================= EMAIL VALIDATION =================
            if (!utils._LCvalidateEmail(ctrlEmailId, "ID")) {
                sap.m.MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return;
            } else {
                ctrlEmailId.setValueState("None");
            }

            // ================= OTP VALIDATION =================
            if (!sOTP) {
                ctrlOTP.setValueState("Error");
                ctrlOTP.setValueStateText(this.i18nModel.getText("Entervalid6digitOTP"));
                sap.m.MessageToast.show(this.i18nModel.getText("Entervalid6digitOTP"));
                return;
            }

            if (!/^\d{6}$/.test(sOTP)) {
                ctrlOTP.setValueState("Error");
                ctrlOTP.setValueStateText(this.i18nModel.getText("Entervalid6digitOTP"));
                sap.m.MessageToast.show(this.i18nModel.getText("Entervalid6digitOTP"));
                return;
            }

            ctrlOTP.setValueState("None");

            // ================= OPEN BUSY DIALOG =================
            var oBusy = this.getBusyDialog();
            if (oBusy) {
                oBusy.open();
            }

            try {

                // 1️⃣ Verify OTP
                const isValid = await this._verifyOTPWithBackend(sOTP);

                if (!isValid) {
                    sap.m.MessageToast.show("Incorrect OTP");
                    return;
                }

                const result = await this.ajaxReadWithJQuery("HM_VerifyOTP", {
                    BookingID: this.BookingID,
                    OTP: sOTP
                });

                const customer = result.data[0]

                this.CustomerEmail = sEmail;

                await this._applyVerifiedUserLogin(customer);

                // ================= RESET =================
                ctrlEmailId?.setValue("");
                ctrlOTP?.setValue("");

                ctrlEmailId?.setValueState("None");
                ctrlOTP?.setValueState("None");

                sap.m.MessageToast.show("Login Successful");

                if (this._bPendingEditRoute) {

                    this._bPendingEditRoute = false;

                    this._onEditRouteMatched();
                }

                this.getView().removeStyleClass("blur-background");
                if (oFragment) {
                    oFragment.close();
                }

            } catch (err) {
                sap.m.MessageToast.show(err.message || "Invalid Credentials, Please try again");
            } finally {
                if (oBusy) {
                    oBusy.close();
                }
            }
        },
        onSubmitNewPassword: async function () {
            const oNew = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "newPass");
            const oConf = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "confPass");

            const pass = oNew.getValue().trim();
            const confirm = oConf.getValue().trim();

            // RESET state before validation
            oNew.setValueState("None");
            oConf.setValueState("None");

            // 1) Required check for New Password
            if (!pass) {
                oNew.setValueState("Error");
                oNew.setValueStateText(this.i18nModel.getText("passwordRequired"));
                sap.m.MessageToast.show(this.i18nModel.getText("passwordRequired"));
                return;
            }

            // 2) Format rule check
            if (!utils._LCvalidatePassword(oNew)) {
                oNew.setValueState("Error");
                oNew.setValueStateText(this.i18nModel.getText("mustContainUppercaseLowercaseNumberSpecialCharacter"));
                return;
            }

            // 3) Required check for Confirm Password
            if (!confirm) {
                oConf.setValueState("Error");
                oConf.setValueStateText(this.i18nModel.getText("confirmPasswordRequired"));
                sap.m.MessageToast.show(this.i18nModel.getText("confirmPasswordRequired"));
                return;
            }

            // 4) Match both
            if (pass !== confirm) {
                oConf.setValueState("Error");
                oConf.setValueStateText(this.i18nModel.getText("nopasswordmatch"));
                sap.m.MessageToast.show(this.i18nModel.getText("nopasswordmatch"));
                return;
            }
            //  PASSED ALL VALIDATIONS → SUCCESS STATE
            oConf.setValueState("None");
            // oConf.setValueStateText("Passwords matched");
            this.getBusyDialog()
            try {
                const oFilters = this._oResetUser?.UserID ? {
                    UserID: this._oResetUser.UserID
                } : {
                    EmailID: this._oResetUser?.EmailID
                };
                await this.ajaxUpdateWithJQuery("HM_Login", {
                    data: {
                        Password: btoa(pass)
                    },
                    filters: oFilters
                });
                MessageBox.success("Password Updated Successfully", {
                    title: "Success",
                    onClose: () => {

                        // fully clean values
                        this._clearAllAuthFields?.();
                        this._clearForgotFlow?.();
                        // reset dialog title
                        sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "authDialog")
                            .getCustomHeader()
                            .getContentMiddle()[0]
                            .setText("Sign In");

                        // switch flow back to signin
                        const vm = this.getView().getModel("LoginViewModel");
                        vm.setProperty("/authFlow", "signin");

                        // show login panel
                        vm.setProperty("/authFlow", "signin");
                        vm.setProperty("/forgotStep", 1);
                        vm.setProperty("/dialogTitle", "Sign In");
                    }
                });

            } catch (err) {
                sap.m.MessageToast.show("Invalid credentials, please try again");
            } finally {
                this.closeBusyDialog() // ALWAYS stop
                this._resetOtpState();
            }
        },

        _startOtpTimer: function () {
            const vm = this.getView().getModel("LoginViewModel");

            this._clearOtpTimer();

            const START = 20;

            vm.setProperty("/canResendOTP", false); // Disable button
            vm.setProperty("/otpTimer", START);
            vm.setProperty("/otpButtonText", `Resend OTP (${START}s)`);

            this._otpInterval = setInterval(() => {

                let remaining = vm.getProperty("/otpTimer") - 1;

                if (remaining <= 0) {
                    this._clearOtpTimer();

                    vm.setProperty("/otpTimer", 0);
                    vm.setProperty("/otpButtonText", "Resend OTP");
                    vm.setProperty("/canResendOTP", true); // Enable button after 20 sec

                    return;
                }

                vm.setProperty("/otpTimer", remaining);
                vm.setProperty("/otpButtonText", `Resend OTP (${remaining}s)`);

            }, 1000);
        },

        _clearOtpTimer: function () {
            if (this._otpInterval) {
                clearInterval(this._otpInterval);
                this._otpInterval = null;
            }
        },

        _resetOtpState: function () {
            const vm = this.getView().getModel("LoginViewModel");

            this._clearOtpTimer();

            vm.setProperty("/otpTimer", 0);
            vm.setProperty("/canResendOTP", true);
            vm.setProperty("/otpButtonText", "Send OTP");
            vm.setProperty("/showOTPField", false);
            vm.setProperty("/isOtpEntered", false);

            const otpCtrl = sap.ui.getCore().byId("signInOTP");
            otpCtrl?.setValue("");
            otpCtrl?.setEnabled(false);
            otpCtrl?.setValueState("None");
            clearInterval(this._otpInterval);
            this._otpInterval = null;


            vm.setProperty("/canResendOTP", true);
            vm.setProperty("/otpTimer", 0);
            vm.setProperty("/otpButtonText", "Send OTP");
        },

        onValidateUser: async function () {
            const oEmailCtrl = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "fpEmailId");
            const isValid =
                utils._LCvalidateEmail(sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "fpEmailId"), "ID")

            if (!isValid) {
                sap.m.MessageToast.show(this.i18nModel.getText("fillMandatoryFields"));
                return;
            }

            const sEmail = oEmailCtrl.getValue().trim();

            this.getBusyDialog()

            try {
                const oResp = await this.ajaxCreateWithJQuery("HostelSendOTP", {
                    EmailID: sEmail,
                    Type: "OTP"
                });;

                if (oResp?.success) {
                    sap.m.MessageToast.show(this.i18nModel.getText("oTPSentCheckyourEmail"));
                    // alert(oResp.OTP);

                    this._oResetUser = {
                        EmailID: sEmail
                    };
                    // ✅ Start resend cooldown
                    this._startOtpCooldown(20);


                    this.getView().getModel("LoginViewModel").setProperty("/forgotStep", 2);
                } else {
                    sap.m.MessageToast.show(this.i18nModel.getText("noUserFoundwithGivenIDName"));
                }

            } catch (err) {
                const sMsg =
                    err?.responseJSON?.message ||
                    this.i18nModel.getText("forgotOtpSendFailed");
                sap.m.MessageToast.show(sMsg);
            } finally {
                this.closeBusyDialog()
            }
        },

        _verifyOTPWithBackend: async function (otp) {
            this.getBusyDialog()
            try {
                // Call the BaseController Generic Read method
                const oResp = await this.ajaxReadWithJQuery("HM_VerifyOTP", {
                    BookingID: this.BookingID,
                    OTP: otp.trim()
                });

                return oResp?.success === true;

            } catch (err) {
                console.error("OTP Verify Error:", err);
                return false;

            } finally {
                this.closeBusyDialog()
            }
        },

        onPressOTP: async function () {

            const oEmailIDCtrl = sap.ui.core.Fragment.byId(
                this.createId("LoginAlertDialog"),
                "emailInput"
            );

            const sUserId = oEmailIDCtrl?.getValue()?.trim();

            // ================= VALIDATION =================
            if (!utils._LCvalidateMandatoryField(oEmailIDCtrl, "ID")) {
                sap.m.MessageToast.show(this.i18nModel.getText("enterValidUserIDUserName"));
                return;
            }

            const payload = {
                BookingID: this.BookingID,
                CustomerEmail: sUserId,
                Type: "BookingOTP"
            };

            // ✅ Proper BusyDialog

            this.getBusyDialog()
            try {

                const oResp = await this.ajaxCreateWithJQuery("EmailOTP", payload);

                // ================= RESPONSE SAFETY =================
                if (!oResp) {
                    throw new Error("No response from server");
                }

                // ================= SUCCESS =================
                if (oResp.success === true) {

                    sap.m.MessageToast.show(
                        oResp.message || this.i18nModel.getText("oTPSentCheckyourEmail")
                    );

                    this._oResetUser = {
                        EmailID: sUserId
                    };

                    const oOtpCtrl = sap.ui.core.Fragment.byId(
                        this.createId("LoginAlertDialog"),
                        "otpInput"
                    );

                    if (oOtpCtrl) {
                        oOtpCtrl.setValue("");
                        oOtpCtrl.setValueState("None");
                        oOtpCtrl.setValueStateText("");
                        oOtpCtrl.focus();
                    }

                    this._startOtpTimer?.();

                } else {
                    // ✅ SHOW BACKEND MESSAGE
                    this.closeBusyDialog()
                    sap.m.MessageToast.show(
                        oResp.message || this.i18nModel.getText("usernotFoundUnabletoSendOTP")
                    );
                }

            } catch (err) {

                this.closeBusyDialog()

                // ✅ SMART ERROR HANDLING
                sap.m.MessageToast.show("Invalid credentials, please try again");

                // if (err?.responseJSON?.message) {
                //     errorMsg = err.responseJSON.message;
                // } else if (err?.message) {
                //     errorMsg = err.message;
                // }

                // sap.m.MessageToast.show(errorMsg);

            } finally {
                this.closeBusyDialog()
            }
        },


        onShowForgotUser: function () {
            this._showForgotSection("secForgotUser");
        },

        _onVerifyOTP: async function () {
            const vm = this.getView().getModel("LoginViewModel");
            const flow = vm.getProperty("/authFlow");

            // Resolve OTP control by flow
            const oOtpInput = (flow === "forgot") ?
                sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "fpOTP") :
                sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signInOTP");

            const otp = oOtpInput.getValue().trim();

            // --- Basic validation ---
            if (!otp) {
                oOtpInput.setValueState(sap.ui.core.ValueState.Error);
                oOtpInput.setValueStateText(this.i18nModel.getText("pleaseEnterOTP"));
                sap.m.MessageToast.show(this.i18nModel.getText("enterOTP"));
                return;
            }

            if (!/^\d{6}$/.test(otp)) {
                oOtpInput.setValueState(sap.ui.core.ValueState.Error);
                oOtpInput.setValueStateText(this.i18nModel.getText("Entervalid6digitOTP"));
                sap.m.MessageToast.show(this.i18nModel.getText("invalidOTP"));
                return;
            }

            // Clear any previous error state
            oOtpInput.setValueState(sap.ui.core.ValueState.None);
            oOtpInput.setValueStateText("");

            // --- Backend verification ---
            let isValid = false;

            try {
                isValid = await this._verifyOTPWithBackend(otp);
            } catch (e) {
                sap.m.MessageToast.show(this.i18nModel.getText("oTPVerificationFailed"));
                return;
            }

            if (!isValid) {
                sap.m.MessageToast.show(this.i18nModel.getText("incorrectOTP"));
                return;
            }

            //  OTP accepted: reset resend cooldown state
            this._resetOtpCooldown();

            //  Forgot Password Flow

            if (flow === "forgot") {
                vm.setProperty("/forgotStep", 3);
                return;
            }
            try {

                const resp = await this.ajaxReadWithJQuery("HM_Customer", {
                    BookingID: this.BookingID,
                    OTP: otp
                });

                sap.m.MessageToast.show(this.i18nModel.getText("loginSuccessful"));
                this._setLoggedInUser(resp.data[0]);
                this._resetAllAuthFields();
                this._oSignDialog.close();

            } catch (e) {
                sap.m.MessageToast.show(this.i18nModel.getText("loginFailed"));
                console.error("OTP login error:", e);

            }
        },

        _startOtpCooldown: function (iSeconds = 20) {
            const vm = this.getView().getModel("LoginViewModel");
            let remaining = iSeconds;

            vm.setProperty("/canResendOTP", false);
            vm.setProperty("/otpButtonText", `Resend OTP in ${remaining}s`);

            if (this._otpInterval) {
                clearInterval(this._otpInterval);
                this._otpInterval = null;
            }

            this._otpInterval = setInterval(() => {
                remaining--;

                if (remaining <= 0) {
                    clearInterval(this._otpInterval);
                    this._otpInterval = null;

                    vm.setProperty("/canResendOTP", true);
                    vm.setProperty("/otpButtonText", "Resend OTP");
                    return;
                }
                vm.setProperty("/otpButtonText", `Resend OTP in ${remaining}s`);

            }, 1000);
        },

        _resetOtpCooldown: function () {
            const vm = this.getView().getModel("LoginViewModel");

            if (this._otpInterval) {
                clearInterval(this._otpInterval);
                this._otpInterval = null;
            }

            vm.setProperty("/otpButtonText", "Send OTP");
            vm.setProperty("/canResendOTP", false);
        },
        _clearAllAuthFields: function () {
            const ids = [
                "signInuserid", "signInusername", "signinPassword",
                "fpEmailId", "fpOTP",
                "newPass", "confPass", "loginOTP"
            ];
            ids.forEach(id => {
                const c = sap.ui.getCore().byId(id);
                if (c) {
                    c.setValue("");
                    c.setValueState("None");
                }
            });
            this._storedLoginCreds = null;
            this._oResetUser = null;
        },

        onBackToLogin: function () {
            // Clean auth data & any internal flags
            this._clearAllAuthFields();

            // Reset only values (not visibility/enabled state)

            sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "fpEmailId").setValue("");

            sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "fpOTP").setValue("");
            sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "newPass").setValue("");
            sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "confPass").setValue("");
            // Update flow using ViewModel
            const vm = this.getView().getModel("LoginViewModel");
            vm.setProperty("/loginMode", "password");
            vm.setProperty("/authFlow", "signin");
            vm.setProperty("/forgotStep", 1);

            vm.setProperty("/authFlow", "signin");
            vm.setProperty("/forgotStep", 1);
            vm.setProperty("/dialogTitle", "Sign In");
            this._resetOtpState();

        },
        onForgotPassword: function () {
            const vm = this.getView().getModel("LoginViewModel");

            vm.setProperty("/authFlow", "forgot");
            vm.setProperty("/forgotStep", 1); // safe, runtime only
            vm.setProperty("/dialogTitle", "Reset Password"); //
        },

        onUserlivechange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
        },

        onEmailliveChange: function (oEvent) {
            utils._LCvalidateEmail(oEvent);
        },
        onSigninPasswordLive: function (oEvent) {
            utils._LCvalidatePassword(oEvent);
        },

        SM_onTogglePasswordVisibility: function (oEvent) {
            const oInput = oEvent.getSource();
            const isPassword = oInput.getType() === "Password";

            oInput.setType(isPassword ? "Text" : "Password");
            oInput.setValueHelpIconSrc(isPassword ? "sap-icon://hide" : "sap-icon://show");
        },
        _getLoginFragmentControl: function (localId) {
            // 1) If you stored the fragment instance (best practice), use it
            if (this._oLoginFragment && typeof this._oLoginFragment.byId === "function") {
                const c = this._oLoginFragment.byId(localId);
                if (c) {
                    console.debug("found via this._oLoginFragment.byId", localId);
                    return c;
                }
            }

            // 2) If you stored dialog instance but not fragment, try to infer prefix from dialog id
            if (this._oLoginAlertDialog && typeof this._oLoginAlertDialog.getId === "function") {
                try {
                    // example dialog id: "__xmlview1--LoginAlertDialog--authDialog"
                    const dialogId = this._oLoginAlertDialog.getId();
                    // get the xmlview prefix (everything before "--LoginAlertDialog--authDialog")
                    const parts = dialogId.split("--");
                    if (parts.length >= 2) {
                        // build prefix: first segment + "--LoginAlertDialog--"
                        const prefix = parts[0] + "--LoginAlertDialog--";
                        const full = prefix + localId; // __xmlview1--LoginAlertDialog--passwordStrengthText
                        const c = sap.ui.getCore().byId(full);
                        if (c) {
                            console.debug("found via dialog prefix", full);
                            return c;
                        }
                    }
                } catch (e) {
                    /* ignore */
                }
            }

            // 3) Try Fragment.byId with raw fragment id (common)
            try {
                const c = sap.ui.core.Fragment.byId("LoginAlertDialog", localId);
                if (c) {
                    console.debug("found via Fragment.byId('LoginAlertDialog',...)", localId);
                    return c;
                }
            } catch (e) {
                /* ignore */
            }

            // 4) Try Fragment.byId with view-scoped id (if you used this.createId when creating fragment)
            try {
                if (this.createId) {
                    const fragId = this.createId("LoginAlertDialog");
                    const c = sap.ui.core.Fragment.byId(fragId, localId);
                    if (c) {
                        console.debug("found via Fragment.byId(this.createId('LoginAlertDialog'),...)", fragId, localId);
                        return c;
                    }
                }
            } catch (e) {
                /* ignore */
            }

            // 5) Try view.byId (if fragment controls were placed inside view aggregation)
            try {
                const c = this.getView().byId(localId);
                if (c) {
                    console.debug("found via view.byId", localId);
                    return c;
                }
            } catch (e) {
                /* ignore */
            }

            // 6) Last resort: global core lookup for any control that endsWith the localId
            const all = sap.ui.getCore().mElements; // internal map, useful for debugging only
            for (const id in all) {
                if (id.endsWith("--" + localId) || id.endsWith("-" + localId) || id === localId) {
                    const c = sap.ui.getCore().byId(id);
                    if (c) {
                        console.debug("found via core fallback", id);
                        return c;
                    }
                }
            }

            console.warn("Could not find login fragment control:", localId);
            return null;
        },

        SM_onChnageSetAndConfirm: function (oEvent) {
            const oInput = oEvent.getSource();
            if (!oInput) {
                return;
            }

            // get the unprefixed id (local id inside fragment)
            const fullId = oInput.getId() || "";
            const localId = fullId.split("--").pop();

            let oStrengthText = null;
            if (localId === "signUpPassword") {
                oStrengthText = this._getLoginFragmentControl("passwordStrengthText");
            } else if (localId === "newPass") {
                oStrengthText = this._getLoginFragmentControl("fpPasswordStrengthText");
            }

            // Pass the actual input control and the strength text (may be null)
            utils._LCvalidatePassword(oInput, oStrengthText);
        },

        SM_onGenerateForgotPassword: function () {
            var oPwdInput = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "newPass");
            var oStrength = sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "fpPasswordStrengthText");

            if (!oPwdInput) {
                console.error("❌ newPass input not found");
                return;
            }

            //  Only generate + validate (NO copying here)
            var pwd = utils._LCgenerateStrongPassword();
            oPwdInput.setValue(pwd);
            utils._LCvalidatePassword(oPwdInput, oStrength);
        },
        onSelectLoginMode: function (e) {
            const vm = this.getView().getModel("LoginViewModel");
            const mode = e.getSource().getText().toLowerCase();

            vm.setProperty("/loginMode", mode);
            vm.setProperty("/showOTPField", false);
            vm.setProperty("/isOtpEntered", false);

            // ✅ guarantee button has text
            if (mode === "otp") {
                vm.setProperty("/otpButtonText", "Send OTP");
            }

            const otpCtrl = sap.ui.core.Fragment.byId(
                this.createId("LoginAlertDialog"),
                "signInOTP"
            );
            if (otpCtrl) {
                otpCtrl.setValue("");
                otpCtrl.setEnabled(false);
            }

            const passCtrl = sap.ui.core.Fragment.byId(
                this.createId("LoginAlertDialog"),
                "signinPassword"
            );
            if (passCtrl) {
                passCtrl.setValue("");
                passCtrl.setValueState("None");
            }
        },

        onDialogClose: function () {

            // User cancelled the OTP dialog — do not auto-resume the page load
            this._bPendingEditRoute = false;
            this._oResetUser = null;

            const oEmail = sap.ui.core.Fragment.byId(
                this.createId("LoginAlertDialog"),
                "emailInput"
            );

            const oOTP = sap.ui.core.Fragment.byId(
                this.createId("LoginAlertDialog"),
                "otpInput"
            );

            // ✅ Clear Email
            if (oEmail) {
                oEmail.setValue("");
                oEmail.setValueState("None");
                oEmail.setValueStateText("");
            }

            // ✅ Clear OTP
            if (oOTP) {
                oOTP.setValue("");
                oOTP.setValueState("None");
                oOTP.setValueStateText("");
            }

            // ✅ Close Dialog
            this.getView().removeStyleClass("blur-background");
            if (this._oLoginAlertDialog) {
                this._oLoginAlertDialog.close();
            }
        },
        onLoginOtpLive: function (e) {
            const vm = this.getView().getModel("LoginViewModel");
            const input = e.getSource();

            // allow only digits and enforce 6 max
            let val = e.getParameter("value").replace(/\D/g, "");
            if (val.length > 6) val = val.slice(0, 6);

            input.setValue(val);

            const isValid = val.length === 6;
            vm.setProperty("/isOtpEntered", isValid);

            if (val.length === 0) {
                input.setValueState("None");
            } else if (!isValid) {
                input.setValueState("Error");
                input.setValueStateText(this.i18nModel.getText("entervaliddigitOTP"));
            } else {
                input.setValueState("None");
            }
        },
        _addPasswordGenerateIcon: function () {

            const aInputs = [
                sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "signUpPassword"),
                sap.ui.core.Fragment.byId(this.createId("LoginAlertDialog"), "newPass")
            ];

            aInputs.forEach((oInput) => {

                if (!oInput || oInput._hasCopyIcon) return;

                oInput.addEndIcon({
                    src: "sap-icon://copy",
                    tooltip: "Copy password",
                    press: this.SM_onCopyPassword.bind(this)
                });

                oInput._hasCopyIcon = true;
            });
        },

        SM_onCopyPassword: function (oEvent) {
            const oIcon = oEvent.getSource();
            const oInput = oIcon.getParent();

            if (!oInput || !oInput.getValue) return;

            const pwd = oInput.getValue();

            if (!pwd) {
                sap.m.MessageToast.show(this.i18nModel.getText("noPasswordCopy"));
                return;
            }

            navigator.clipboard.writeText(pwd)
                .then(() => {
                    sap.m.MessageToast.show(this.i18nModel.getText("passwordCopied"));
                })
                .catch(() => {

                    try {
                        const oTemp = document.createElement("textarea");
                        oTemp.value = pwd;
                        document.body.appendChild(oTemp);
                        oTemp.select();
                        document.execCommand("copy");
                        document.body.removeChild(oTemp);

                        sap.m.MessageToast.show(this.i18nModel.getText("passwordCopied"));

                    } catch (err) {
                        sap.m.MessageToast.show(this.i18nModel.getText("copyFailed"));
                    }
                });
        },
        parseDate: function (dateStr) {
            var parts = dateStr.split("/"); // ["08","07","2026"]
            return new Date(parts[2], parts[1] - 1, parts[0]); // year, month(0-based), day
        },

        BV_onOpenVH: async function () {
            var oBookingView = this.getView().getModel("BookingView");

            if (!oBookingView || !oBookingView.getProperty("/editModeEnabled")) {
                return;
            }

            var oHostelModel = this.getView().getModel("HostelModel");

            var BranchCode = oHostelModel.getProperty("/BranchCode");

            var bookingStartDate = oHostelModel.getProperty("/BookingDate") ? new Date(oHostelModel.getProperty("/BookingDate")) : new Date();




            bookingStartDate.setHours(0, 0, 0, 0);

            if (!bookingStartDate) {
                MessageToast.show("Please select the dates before checking coupons")
                return;
            }

            if (!this.SC_Dialog) {
                this.SC_Dialog = sap.ui.xmlfragment(
                    "sap.ui.com.project1.fragment.ShowCoupon",
                    this
                );
                this.getView().addDependent(this.SC_Dialog);
            }

            this.getBusyDialog();

            const oResponse = await this.ajaxReadWithJQuery("HM_CouponBookingCount", {
                Status: "Active",
                BranchCode: BranchCode
            });

            this.closeBusyDialog();

            // Show only coupons valid for the selected booking dates
            var aFilteredCoupons = oResponse.data.filter(function (coupon) {

                var couponStart = new Date(coupon.StartDate);
                var couponEnd = new Date(coupon.EndDate);


                couponStart.setHours(0, 0, 0, 0);
                couponEnd.setHours(23, 59, 59, 999);

                return bookingStartDate >= couponStart &&
                    bookingStartDate <= couponEnd;

            }.bind(this));

            this.getView().setModel(
                new sap.ui.model.json.JSONModel(aFilteredCoupons),
                "ShowCouponDetails"
            );

            this.SC_Dialog.open();
        },
        SC_onVHDPick: function (oEvent) {
            var oSelectedData = oEvent.getSource().getBindingContext("ShowCouponDetails").getObject();

            this.getView().getModel("HostelModel").setProperty("/CouponCode", oSelectedData.CouponCode);

            this.SC_Dialog.close();

            this._resetCouponState(true);
            this.onApplyCoupon();
        },
        SC_onVHDClose: function () {
            this.SC_Dialog.close();
        }
    });
});
