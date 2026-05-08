sap.ui.define([
    "./Booking.controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "../utils/validation"
], function (BookingController, JSONModel, MessageBox, MessageToast, utils) {
    "use strict";

    return BookingController.extend("sap.ui.com.project1.controller.EditBooking", {

        onInit: function () {
            this._bEditMode = true;

            this.getOwnerComponent()
                .getRouter()
                .getRoute("RouteEditBooking")
                .attachMatched(this._onEditRouteMatched, this);

            this._iFacilityStartIndex = 0;
            this._iFacilityPageSize = 3;
            this._sLastPrimaryMemberId = "SELF";
            // Initialize member data loading flags
            this._bMemberDataLoaded = false;
            this._bMemberDataLoading = false;

            this.getView().addEventDelegate({
                onBeforeHide: function () {
                    this._resetBookingPageModels();
                }.bind(this)
            });
        },

        _onEditRouteMatched: async function (oEvent) {
            if (performance.navigation && performance.navigation.type === 1) {
                var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                oRouter.navTo("RouteHostel", {}, true);
            }
            var oArgs = oEvent.getParameter("arguments") || {};
            var sBookingID = oArgs.BookingID ? decodeURIComponent(oArgs.BookingID) : "";
            var sMemberID = oArgs.MemberID ? decodeURIComponent(oArgs.MemberID) : "";

            if (!sBookingID) {
                MessageBox.error("Booking ID is required for editing.");
                return;
            }

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
            oBookingViewData.showEditButton = false; // Will be set after loading
            
            this.getView().setModel(oHostelModel, "HostelModel");
            this.getView().setModel(new JSONModel(oBookingViewData), "BookingView");
            this.getView().setModel(new JSONModel(this._getFacilityModelInitialData ? this._getFacilityModelInitialData() : this._getDefaultFacilityData()), "FacilityModel");
            this.getView().setModel(new JSONModel(this._getFacilitySelectionInitialData ? this._getFacilitySelectionInitialData() : this._getDefaultFacilitySelectionData()), "FacilitySelection");
            this.getView().setModel(new JSONModel(this._getPaymentModelInitialData ? this._getPaymentModelInitialData() : this._getDefaultPaymentData()), "PaymentModel");

            this._resetBookingPageModels();

            try {
                this.getBusyDialog();

                // 1. Fetch booking data using HM_Customer
                var oResponse = await this.ajaxReadWithJQuery("HM_Customer", {
                    BookingID: sBookingID,
                    MemberID: sMemberID
                });

                var oCustomer = oResponse && oResponse.Customers || oResponse && oResponse.value && oResponse.value[0] || {};
                var oBooking = (Array.isArray(oCustomer.Bookings) ? oCustomer.Bookings[0] : oCustomer.Bookings) || {};
                var sBranchCode = oBooking.BranchCode || "";
                var sStatus = oBooking.Status || "";

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

                this._recalculateSummary();
                // Don't make date pickers read-only here - they're controlled by editModeEnabled binding
                oHostelModel.refresh(true);
                
                // Check if status is "New" and update BookingView model accordingly
                var oBookingView = this.getView().getModel("BookingView");
                var bIsStatusNew = sStatus === "New";
                oBookingView.setProperty("/isStatusNew", bIsStatusNew);
                oBookingView.setProperty("/showEditButton", bIsStatusNew);
                oBookingView.setProperty("/editModeEnabled", false); // Start in read-only mode

            } catch (oError) {
                console.error("Edit booking load error:", oError);
                MessageBox.error("Unable to load booking details for edit.");
            } finally {
                this.closeBusyDialog();
            }
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
                            console.log("✅ Member data loaded in background:", aMemberDocs.length, "documents");
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
            // Check if document has a URL property (backend should provide direct URLs)
            if (oDoc && (oDoc.DocumentUrl || oDoc.FileUrl || oDoc.Url)) {
                const sUrl = oDoc.DocumentUrl || oDoc.FileUrl || oDoc.Url;
                // Open URL in new tab or display in dialog
                window.open(sUrl, '_blank');
                return;
            }

            // Fallback to parent implementation (which uses Base64 decoding)
            BookingController.prototype._previewDocument.call(this, oDoc);
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
                var sSelectionMode = String(oItem.SelectionMode || "").trim().toUpperCase() || "SINGLE";
                var sFacilityName = fnNormalizeKey(oItem.FacilityName || oItem.Type || "");
                var sChargeType = String(oItem.FacilityChargeType || "").trim().toUpperCase();
                var sUnitText = fnNormalizeKey(oItem.UnitText || "");
                return [
                    sFacilityName,
                    sSelectionMode,
                    sSelectionMode === "PERSON_QTY" ? sChargeType : "",
                    sUnitText
                ].join("|");
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
                        Price: fnToNumber(oItem.UnitPrice || oItem.PricePerUnit || oItem.UnitAmount),
                        SelectedPrice: fnToNumber(oItem.UnitPrice || oItem.PricePerUnit || oItem.UnitAmount),
                        SelectedPriceType: oItem.UnitText || "Unit Price",
                        UnitPrice: fnToNumber(oItem.UnitPrice || oItem.PricePerUnit || oItem.UnitAmount),
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
            var oStart = oBooking.StartDate ? new Date(oBooking.StartDate) : null;
            var oEnd = oBooking.EndDate ? new Date(oBooking.EndDate) : null;
            var sSelectedPriceType = oBooking.PaymentType || "";
            if (oStart && oEnd && !isNaN(oStart.getTime()) && !isNaN(oEnd.getTime())) {
                var iMonths = (oEnd.getFullYear() - oStart.getFullYear()) * 12 + (oEnd.getMonth() - oStart.getMonth());

                if (oEnd.getDate() >= oStart.getDate()) {
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

                    if (mOptions.navigateToManageProfile !== false) {
                        this.getOwnerComponent().getRouter().navTo("RouteManageProfile");
                    }
                }.bind(this)
            });
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
                MessageToast.show("Please fill mandatory booking details");
                return false;
            }

            if ((oBookingView.getProperty("/FamilyMembers") || []).filter(function (oMember) {
                return !!oMember.Selected;
            }).length < 1) {
                MessageToast.show("Please select at least one member from the member list.");
                return false;
            }

            if (!oModel.getProperty("/CustomerEmail") || !oModel.getProperty("/MobileNo")) {
                MessageToast.show("Please complete contact details before payment");
                return false;
            }

            if (bSupportsCustomerGST && bIsBusinessTravel) {
                var isGStvalidate = (
                    utils._LCvalidateGstNumber(this.getView().byId("EditBookGst_ID"), "ID") &&
                    utils._LCvalidateMandatoryField(this.getView().byId("EditBookCompanyname_ID"), "ID") &&
                    utils._LCvalidateMandatoryField(this.getView().byId("EditBookconpanyAddress_ID"), "ID")
                );

                if (!isGStvalidate) {
                    MessageToast.show("Please fill business GST details");
                    return false;
                }

                if (!this._isValidGSTINValue(sCustomerGSTIN)) {
                    MessageToast.show("Please enter a valid GSTIN");
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
                oPayloadData.data[0].BookingID = sBookingID;
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
                    MessageToast.show("Please complete payment verification details");
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
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
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
                return this._toNumber(
                    oFacility.MinimumPrice ||
                    oSelectedFacility.MinimumPrice ||
                    oSelectedFacility.PackagePrice ||
                    oSelectedFacility.SelectedPrice ||
                    oSelectedFacility.Price
                );
            }

            var fSelectedPrice = this._toNumber(oSelectedFacility.SelectedPrice || oSelectedFacility.Price || oSelectedFacility.UnitPrice || oSelectedFacility.BasicFacilityPrice);
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

            return this._toNumber(oFacility.UnitPrice || oFacility.PerDayPrice || oFacility.PerMonthPrice || oFacility.PerYearPrice || 0);
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
                    var fSavedPrice = this._toNumber(oFacility.SelectedPrice || oFacility.Price || oFacility.UnitPrice || oFacility.CurrentPrice);
                    var sSavedPriceType = oFacility.SelectedPriceType || oFacility.UnitText || (oMatchedOption && oMatchedOption.key) || "Unit Price";

                    if (oFacility.SelectionMode === "PERSON_QTY") {
                        fSavedPrice = this._toNumber(
                            oFacility.MinimumPrice ||
                            oFacility.PackagePrice ||
                            fSavedPrice ||
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

        formatSelectedFacilitiesBreakdown: function (aFacilities) {
            if (!Array.isArray(aFacilities) || aFacilities.length === 0) {
                return "";
            }

            return aFacilities.map(function (oFacility) {
                var sName = oFacility.FacilityName || "Facility";
                var sBreakdown = oFacility.BreakdownText || "";
                var sTotal = oFacility.TotalAmount !== undefined && oFacility.TotalAmount !== null
                    ? " = " + oFacility.TotalAmount + " " + (oFacility.Currency || "")
                    : "";

                return sName + (sBreakdown ? ": " + sBreakdown : "") + sTotal;
            }).join("\n");
        },

        _processFacilitiesForEdit: function () {
            var oHostelModel = this.getView().getModel("HostelModel");
            var iExtraBed = this._toNumber(oHostelModel.getProperty("/ExtraBed"));
            var aSelectedFacilities = oHostelModel.getProperty("/AllSelectedFacilities") || [];
            var aFacilities = this._aAllFacilities || [];

            // Filter and process facilities
            var aProcessedFacilities = aFacilities
                .filter(function (oFacility) {
                    if ((oFacility.Type || "").toLowerCase().trim() === "extra bed") {
                        return iExtraBed > 0;
                    }
                    return true;
                })
                .map(function (oFacility) {
                    var oSelectedFacility = this._findSelectedFacilityForEdit(oFacility, aSelectedFacilities);
                    var sSelectionMode = oSelectedFacility.SelectionMode || oFacility.SelectionMode || this._getFacilitySelectionMode(oFacility);
                    var bIsSelected = !!(oSelectedFacility.FacilityName || oSelectedFacility.FacilityID || oSelectedFacility.ID);
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

                    return {
                        FacilityID: oSelectedFacility.FacilityID || oFacility.ID,
                        CatalogFacilityID: oFacility.ID,
                        FacilityName: oFacility.FacilityName || oFacility.Type,
                        Type: oFacility.Type,
                        SelectionMode: sSelectionMode,
                        BranchCode: oFacility.BranchCode,
                        Currency: oSelectedFacility.Currency || oFacility.Currency || oHostelModel.getProperty("/Currency") || "INR",
                        Image: this._getFacilityImageSource(oFacility),
                        UnitPrice: this._toNumber(oSelectedFacility.UnitPrice || oSelectedFacility.Price || oFacility.UnitPrice),
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
                        PackagePrice: fMinimumPrice
                    };
                }.bind(this));

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
        onEditBookingPress: function () {
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
            // BookingView is relatively flat, shallow copy is sufficient
            this._backupBookingView = Object.assign({}, oBookingViewData);
            // Facility models contain nested arrays/objects, need deep copy for proper restoration
            this._backupFacilityModel = JSON.parse(JSON.stringify(oFacilityModelData));
            this._backupFacilitySelection = JSON.parse(JSON.stringify(oFacilitySelectionData));
            // Backup _aAllFacilities array which contains selection state
            this._backupAllFacilities = JSON.parse(JSON.stringify(this._aAllFacilities || []));
            
            oBookingView.setProperty("/editModeEnabled", true);
        },

        // Cancel edit mode and revert to read-only
        onCancelEditPress: function () {
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
        },

        // Override to always fully clear coupon state (including typed value)
        // Parent uses _resetCouponState(true) for facility changes which keeps the coupon input value
        _resetCouponState: function (bKeepTypedValue) {
            BookingController.prototype._resetCouponState.call(this, false);
        },

        // Override to clear coupon field when room plan changes
        onRoomPlanChange: function (oEvent) {
            BookingController.prototype.onRoomPlanChange.call(this, oEvent);
            this._resetCouponState(false);
            this._recalculateSummary();
        },

        // Override facility card press to check edit mode
        onFacilityCardPress: function (oFacility, oCard, oEvent) {
            var oBookingView = this.getView().getModel("BookingView");
            if (!oBookingView.getProperty("/editModeEnabled")) {
                return; // Do nothing if not in edit mode
            }
            // Call parent method
            sap.ui.com.project1.controller.Booking.prototype.onFacilityCardPress.call(this, oFacility, oCard, oEvent);
        },

        // Override the nav back to always go to ManageProfile
        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteManageProfile");
        },

        _getDefaultFacilityData: function () {
            return {
                Facilities: []
            };
        },

        _getDefaultFacilitySelectionData: function () {
            return {
                selectedFacilities: []
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
        }
    });
});
