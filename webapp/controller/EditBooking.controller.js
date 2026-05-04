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

            this.getView().addEventDelegate({
                onBeforeHide: function () {
                    this._resetBookingPageModels();
                }.bind(this)
            });
        },

        _onEditRouteMatched: async function (oEvent) {
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

                // 2. Fetch bed type + room data via BookingBedTypeRoomReadCall (same as _loadFilteredData in View_Rooms)
                var oRoomData = {};
                var oPricingData = {};
                if (sBranchCode) {
                    try {
                        var oBedTypeResp = await this.ajaxReadWithJQuery("BookingBedTypeRoomReadCall", {
                            BranchCode: sBranchCode
                        });
                        var aBedTypes = (oBedTypeResp && oBedTypeResp.data && oBedTypeResp.data.HM_BedType) || [];
                        var aRooms = (oBedTypeResp && oBedTypeResp.data && oBedTypeResp.data.HM_Rooms) || [];

                        // Find matching bed type by Name + ACType (like _loadFilteredData does)
                        var sBedType = oBooking.BedType || "";
                        var sBedName = sBedType.replace(/\s*-\s*(AC|NON-AC)$/i, "").trim();
                        var sACType = sBedType.indexOf("NON-AC") >= 0 ? "NON-AC" : "AC";
                        oRoomData = aBedTypes.find(function (b) {
                            return b.Name === sBedName && b.BranchCode === sBranchCode && b.ACType === sACType;
                        }) || aBedTypes.find(function (b) {
                            return b.BranchCode === sBranchCode;
                        }) || {};

                        // Find matching room for pricing (BedTypeName = "Name - ACType")
                        var sBedTypeName = (oRoomData.Name || sBedName) + " - " + (oRoomData.ACType || sACType);
                        oPricingData = aRooms.find(function (r) {
                            return r.BranchCode === sBranchCode && r.BedTypeName && r.BedTypeName.trim().toLowerCase() === sBedTypeName.trim().toLowerCase();
                        }) || aRooms.find(function (r) {
                            return r.BranchCode === sBranchCode;
                        }) || {};
                    } catch (e) {
                        // Bed type fetch failed — continue with booking data only
                    }
                }

                // 3. Fetch branch data for GST, CheckIn/Out times (from getBranchHotelData)
                var oBranchData = {};
                if (sBranchCode) {
                    try {
                        var oBranchResp = await this.ajaxReadWithJQuery("getBranchHotelData", {
                            BranchCode: sBranchCode,
                            BranchID: sBranchCode
                        });
                        var aBranches = (oBranchResp && oBranchResp.HM_Branch) || [];
                        oBranchData = aBranches.find(function (b) {
                            return b.BranchID === sBranchCode;
                        }) || aBranches[0] || {};
                    } catch (e) {
                        // Branch data fetch failed — continue
                    }
                }

                // 3. Also fetch member documents (like onConfirmBooking does)
                var aMemberDocs = [];
                try {
                    var oLoginModel = sap.ui.getCore().getModel("LoginModel");
                    var oUser = oLoginModel && oLoginModel.getData && oLoginModel.getData() || {};
                    if (oUser.UserID) {
                        var oMemberResp = await this.ajaxReadWithJQuery("HM_MemberDocument", { UserID: oUser.UserID });
                        aMemberDocs = Array.isArray(oMemberResp && oMemberResp.data) ? oMemberResp.data : [];
                    }
                } catch (e) {
                    // Member fetch failed — continue
                }

                var oEditData = this._normalizeBookingEditData(oResponse, sBookingID, oBranchData, oRoomData, oPricingData, aMemberDocs);
                var aExistingPayments = await this._readEditPaymentsByBookingId(sBookingID);
                var fPaymentPaidAmount = this._getEditPaymentPaidAmount(aExistingPayments);

                oHostelModel.setData(oEditData);
                oHostelModel.setProperty("/IsEditMode", true);
                oHostelModel.setProperty("/BookingID", sBookingID);
                oHostelModel.setProperty("/EditMemberID", sMemberID);
                oHostelModel.setProperty("/HasExistingPayments", aExistingPayments.length > 0);
                oHostelModel.setProperty("/PaymentPaidAmount", fPaymentPaidAmount);

                this._initializeBookingData();
                this._prefillLoggedInUser();
                this._syncPropertyTypeState();
                this._syncPlanState();
                this._applySelectedPlanPrice();

                await this._loadFacilities();
                this._rebuildSelectedFacilities();
                await this._loadAdvertisements();

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
                MessageBox.error("Unable to load booking details for edit.");
            } finally {
                this.closeBusyDialog();
            }
        },

        _normalizeBookingEditData: function (oResponse, sBookingID, oBranchData, oRoomData, oPricingData, aMemberDocs) {
            var oCustomer = oResponse && oResponse.Customers || oResponse && oResponse.value && oResponse.value[0] || {};
            var oBooking = (Array.isArray(oCustomer.Bookings) ? oCustomer.Bookings[0] : oCustomer.Bookings) || {};
            oBranchData = oBranchData || {};
            oRoomData = oRoomData || {};
            oPricingData = oPricingData || {};
            aMemberDocs = aMemberDocs || [];

            // Parse FacilityItems — aggregate HM_Customer rows into the structure used by Booking.controller.
            // HM_Customer can return one row per facility, per person, or per quantity. The edit page must
            // normalize all supported selection modes before _loadFacilities merges with HM_Facilities:
            // SINGLE, QTY, PERSON, PERSON_QTY.
            var fnToNumber = function (vValue) {
                var fValue = parseFloat(String(vValue === null || vValue === undefined ? "" : vValue).replace(/,/g, "").trim());
                return isNaN(fValue) ? 0 : fValue;
            };
            var fnNormalizeFacilityKey = function (sValue) {
                return String(sValue || "").trim().toLowerCase();
            };
            var fnNormalizeSelectionMode = function (sValue) {
                var sMode = String(sValue || "").trim().toUpperCase();
                return ["SINGLE", "QTY", "PERSON", "PERSON_QTY"].indexOf(sMode) >= 0 ? sMode : "SINGLE";
            };
            var fnGetPeriodMultiplierFromBooking = function (sUnitText) {
                var sUnit = String(sUnitText || "").trim();
                var oStartDate = oBooking.StartDate ? new Date(oBooking.StartDate) : null;
                var oEndDate = oBooking.EndDate ? new Date(oBooking.EndDate) : null;

                if (!oStartDate || !oEndDate || isNaN(oStartDate.getTime()) || isNaN(oEndDate.getTime()) || oEndDate <= oStartDate) {
                    return 1;
                }

                if (sUnit === "Per Day") {
                    return Math.max(Math.floor((oEndDate - oStartDate) / 86400000), 1);
                }

                if (sUnit === "Per Month") {
                    var iMonths = (oEndDate.getFullYear() - oStartDate.getFullYear()) * 12 + (oEndDate.getMonth() - oStartDate.getMonth());
                    if (oEndDate.getDate() >= oStartDate.getDate()) {
                        iMonths += 1;
                    }
                    return Math.max(iMonths, 1);
                }

                if (sUnit === "Per Year") {
                    var iYears = oEndDate.getFullYear() - oStartDate.getFullYear();
                    if (oEndDate.getMonth() > oStartDate.getMonth() ||
                        (oEndDate.getMonth() === oStartDate.getMonth() && oEndDate.getDate() >= oStartDate.getDate())) {
                        iYears += 1;
                    }
                    return Math.max(iYears, 1);
                }

                return 1;
            };
            var fnGetRowQuantity = function (oItem, sSelectionMode) {
                var iQty = parseInt(oItem.Quantity || oItem.quantity, 10);
                if (!isNaN(iQty) && iQty > 0) {
                    return iQty;
                }

                if (sSelectionMode === "QTY" || sSelectionMode === "PERSON_QTY") {
                    return 0;
                }

                return 1;
            };
            var fnDeriveUnitPrice = function (oItem, sSelectionMode, iQty) {
                var sUnitText = oItem.UnitText || "Unit Price";
                var fExplicitUnitPrice = fnToNumber(oItem.UnitPrice || oItem.PricePerUnit || oItem.UnitAmount);
                var fBasicPrice = fnToNumber(oItem.BasicFacilityPrice);
                var fRowTotal = fnToNumber(oItem.FacilitiPrice || oItem.Price || oItem.TotalAmount || oItem.Amount);
                var iSafeQty = Math.max(parseInt(iQty, 10) || 0, 0);
                var iPeriodMultiplier = fnGetPeriodMultiplierFromBooking(sUnitText);

                if (fExplicitUnitPrice > 0) {
                    return fExplicitUnitPrice;
                }
                if (fBasicPrice > 0) {
                    return fBasicPrice;
                }
                if ((sSelectionMode === "QTY" || sSelectionMode === "PERSON_QTY") && iSafeQty > 0 && fRowTotal > 0) {
                    return Number((fRowTotal / iSafeQty).toFixed(2));
                }
                if ((sSelectionMode === "SINGLE" || sSelectionMode === "PERSON") && iPeriodMultiplier > 0 && fRowTotal > 0) {
                    return Number((fRowTotal / iPeriodMultiplier).toFixed(2));
                }

                return fRowTotal;
            };
            var fnAddUnique = function (aTarget, sValue) {
                sValue = String(sValue || "").trim();
                if (sValue && aTarget.indexOf(sValue) < 0) {
                    aTarget.push(sValue);
                }
            };
            var fnAddPersonQuantity = function (aTarget, sPersonId, sPersonName, iQty) {
                sPersonId = String(sPersonId || "").trim();
                sPersonName = String(sPersonName || "").trim();
                iQty = Math.max(parseInt(iQty, 10) || 0, 0);

                if (!sPersonId && !sPersonName) {
                    return;
                }

                var oExisting = aTarget.find(function (oLine) {
                    return String(oLine.personId || "").trim() === sPersonId && String(oLine.personName || "").trim() === sPersonName;
                });

                if (oExisting) {
                    oExisting.qty = Math.max(parseInt(oExisting.qty, 10) || 0, 0) + iQty;
                    if (!oExisting.personName && sPersonName) {
                        oExisting.personName = sPersonName;
                    }
                    return;
                }

                aTarget.push({
                    personId: sPersonId,
                    personName: sPersonName,
                    qty: iQty
                });
            };

            var aRawFacilities = oCustomer.FacilityItems || [];
            var oFacilityMap = {};
            aRawFacilities.forEach(function (oItem) {
                var sKey = fnNormalizeFacilityKey(oItem.FacilityName || oItem.Type || oItem.FacilityID || oItem.ID || "");
                if (!sKey) { return; }

                var sSelectionMode = fnNormalizeSelectionMode(oItem.SelectionMode);
                var sUnitText = oItem.UnitText || "Unit Price";
                var iQty = fnGetRowQuantity(oItem, sSelectionMode);
                var iEffectiveQty = iQty || ((sSelectionMode === "QTY" || sSelectionMode === "PERSON_QTY") ? 0 : 1);
                var fUnitPrice = fnDeriveUnitPrice(oItem, sSelectionMode, iEffectiveQty);
                var fRowTotal = fnToNumber(oItem.FacilitiPrice || oItem.Price || oItem.TotalAmount || oItem.Amount);
                var sMemberID = String(oItem.MemberID || "").trim();
                var sMemberName = String(oItem.MemberName || oItem.PersonName || "").trim();

                if (!oFacilityMap[sKey]) {
                    oFacilityMap[sKey] = {
                        FacilityID: oItem.FacilityID || oItem.ID || "",
                        FacilityName: oItem.FacilityName || oItem.Type || "",
                        Type: oItem.Type || "",
                        SelectionMode: sSelectionMode,
                        UnitText: sUnitText,
                        Price: fUnitPrice,
                        SelectedPrice: fUnitPrice,
                        SelectedPriceType: sUnitText,
                        UnitPrice: fUnitPrice,
                        BasicFacilityPrice: fnToNumber(oItem.BasicFacilityPrice),
                        FacilityChargeType: oItem.FacilityChargeType || "ONCE_PER_BOOKING",
                        Quantity: sSelectionMode === "QTY" ? 0 : 1,
                        Currency: oItem.Currency || "",
                        Image: oItem.Image || "",
                        SavedTotalAmount: 0,
                        SavedQuantity: 0,
                        RawFacilityItems: [],
                        SelectedPersonIds: [],
                        PersonQuantities: []
                    };
                }

                var oAgg = oFacilityMap[sKey];
                oAgg.RawFacilityItems.push(Object.assign({}, oItem));
                oAgg.SelectionMode = oAgg.SelectionMode || sSelectionMode;
                oAgg.UnitText = oAgg.UnitText || sUnitText;
                oAgg.SelectedPriceType = oAgg.SelectedPriceType || sUnitText;
                oAgg.Currency = oAgg.Currency || oItem.Currency || "";
                oAgg.FacilityChargeType = oAgg.FacilityChargeType || oItem.FacilityChargeType || "ONCE_PER_BOOKING";
                oAgg.SavedTotalAmount = Number((fnToNumber(oAgg.SavedTotalAmount) + fRowTotal).toFixed(2));

                if (fUnitPrice > 0) {
                    oAgg.Price = fUnitPrice;
                    oAgg.SelectedPrice = fUnitPrice;
                    oAgg.UnitPrice = fUnitPrice;
                }

                if (sSelectionMode === "QTY") {
                    oAgg.Quantity = Math.max(parseInt(oAgg.Quantity, 10) || 0, 0) + Math.max(iEffectiveQty, 0);
                    oAgg.SavedQuantity = Math.max(parseInt(oAgg.SavedQuantity, 10) || 0, 0) + Math.max(iEffectiveQty, 0);
                } else if (sSelectionMode === "PERSON_QTY") {
                    oAgg.SavedQuantity = Math.max(parseInt(oAgg.SavedQuantity, 10) || 0, 0) + Math.max(iEffectiveQty, 0);
                    if (sMemberID || sMemberName) {
                        fnAddUnique(oAgg.SelectedPersonIds, sMemberID);
                        fnAddPersonQuantity(oAgg.PersonQuantities, sMemberID, sMemberName, iEffectiveQty);
                    }
                } else if (sSelectionMode === "PERSON") {
                    if (sMemberID) {
                        fnAddUnique(oAgg.SelectedPersonIds, sMemberID);
                    }
                    if (sMemberID || sMemberName) {
                        fnAddPersonQuantity(oAgg.PersonQuantities, sMemberID, sMemberName, 1);
                    }
                    oAgg.Quantity = 1;
                } else {
                    oAgg.Quantity = 1;
                }

                if (typeof oItem.SelectedPersonIds === "string") {
                    try {
                        var aParsedSelectedIds = JSON.parse(oItem.SelectedPersonIds);
                        if (Array.isArray(aParsedSelectedIds)) {
                            aParsedSelectedIds.forEach(function (sId) {
                                fnAddUnique(oAgg.SelectedPersonIds, sId);
                            });
                        }
                    } catch (e) { /* ignore */ }
                }
                if (typeof oItem.PersonQuantities === "string") {
                    try {
                        var aParsedPersonQty = JSON.parse(oItem.PersonQuantities);
                        if (Array.isArray(aParsedPersonQty)) {
                            aParsedPersonQty.forEach(function (oLine) {
                                fnAddUnique(oAgg.SelectedPersonIds, oLine.personId);
                                fnAddPersonQuantity(oAgg.PersonQuantities, oLine.personId, oLine.personName, oLine.qty);
                            });
                        }
                    } catch (e) { /* ignore */ }
                }
            });

            var aParsedFacilities = Object.keys(oFacilityMap).map(function (sKey) {
                return oFacilityMap[sKey];
            });

            // Determine ExtraBed from room data or from selected facilities
            var iExtraBed = oRoomData.ExtraBed || oBooking.ExtraBed || 0;
            if (!iExtraBed) {
                aParsedFacilities.forEach(function (oFac) {
                    if ((oFac.Type || oFac.FacilityName || "").toLowerCase().indexOf("extra bed") >= 0) {
                        iExtraBed = 1;
                    }
                });
            }

            // Calculate duration in months from start / end dates
            var iSelectedMonths = 1;
            var oStart = oBooking.StartDate ? new Date(oBooking.StartDate) : null;
            var oEnd = oBooking.EndDate ? new Date(oBooking.EndDate) : null;
            if (oStart && oEnd && !isNaN(oStart.getTime()) && !isNaN(oEnd.getTime())) {
                var iMonths = (oEnd.getFullYear() - oStart.getFullYear()) * 12 + (oEnd.getMonth() - oStart.getMonth());
                if (oEnd.getDate() >= oStart.getDate()) { iMonths += 1; }
                iSelectedMonths = Math.max(iMonths, 1);
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
            var sSelectedPriceType = oBooking.PaymentType || "";
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
                var sFacilityId = sFallbackFacilityId;
                var sMemberId = String(oRow.MemberID || "").trim();
                var sMemberName = String(oRow.MemberName || "").trim();

                if (iRawIndex >= 0) {
                    aUsedIndexes.push(iRawIndex);
                    sFacilityId = String(aRawItems[iRawIndex].FacilityID || aRawItems[iRawIndex].ID || sFallbackFacilityId || "").trim();
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
            this._aDeletedFacilityIds = null;
        },

        _handleEditBookingSuccess: function (sMessage, mOptions) {
            mOptions = mOptions || {};
            MessageBox.success(sMessage || "Booking updated successfully.", {
                title: "Success",
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

            return this.byId(sFieldId) ||
                sap.ui.getCore().byId(this._oPaymentDialog.getId() + "--" + sFieldId) ||
                sap.ui.getCore().byId(sFieldId) ||
                (this._oPaymentDialog.findAggregatedObjects && this._oPaymentDialog.findAggregatedObjects(true, function (oControl) {
                    return oControl && oControl.getId && (
                        oControl.getId() === sFieldId ||
                        oControl.getId().slice(-("--" + sFieldId).length) === "--" + sFieldId
                    );
                })[0]) ||
                null;
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

        onSubmitPress: async function () {
            if (this._isPaymentDialogSubmission(arguments[0]) &&
                this.getView().getModel("HostelModel").getProperty("/IsEditMode")) {
                return this._onPaymentSubmit();
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
                return sFacilityNameKey && sSelectedNameKey &&
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
                    return oOption.key === "Unit Price";
                });

                oFacility.SelectionMode = oFacility.SelectionMode || this._getFacilitySelectionMode(oFacility);
                oFacility.SelectionModeLabel = this._getFacilitySelectionModeLabel(oFacility.SelectionMode);

                if (oFacility.Selected) {
                    var fSavedPrice = this._toNumber(oFacility.SelectedPrice || oFacility.Price || oFacility.UnitPrice || oFacility.CurrentPrice);
                    var sSavedPriceType = oFacility.SelectedPriceType || oFacility.UnitText || (oMatchedOption && oMatchedOption.key) || "Unit Price";

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
                        ? (oFacility.FacilityChargeType || "ONCE_PER_BOOKING")
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

        _loadFacilities: async function () {
            var oHostelModel = this.getView().getModel("HostelModel");
            var sBranchCode = oHostelModel.getProperty("/BranchCode");
            var iExtraBed = this._toNumber(oHostelModel.getProperty("/ExtraBed"));
            var aSelectedFacilities = oHostelModel.getProperty("/AllSelectedFacilities") || [];

            this._aAllFacilities = [];

            if (!sBranchCode) {
                this.getView().getModel("FacilityModel").setProperty("/Facilities", []);
                this._renderFacilityCards();
                return;
            }

            try {
                var oResponse = await this.ajaxReadWithJQuery("HM_Facilities", { BranchCode: sBranchCode });
                var aFacilities = oResponse && oResponse.data || [];

                this._aAllFacilities = aFacilities
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
                        var fSelectedPrice = this._deriveEditFacilitySelectedPrice(oSelectedFacility, oFacility, sSelectionMode);
                        var sSelectedPriceType = oSelectedFacility.SelectedPriceType || oSelectedFacility.UnitText || "Unit Price";

                        return {
                            FacilityID: oSelectedFacility.FacilityID || "",
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
                            FacilityChargeType: oSelectedFacility.FacilityChargeType || "ONCE_PER_BOOKING",
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
                            MinimumQty: bIsPersonQty ? (parseInt(oFacility.MinimumQty, 10) || 0) : 0,
                            MinimumPrice: bIsPersonQty ? (parseFloat(oFacility.MinimumPrice) || 0) : 0
                        };
                    }.bind(this));

                this._syncSelectedFacilityPersonsWithOccupants();
                this._applyEditFacilityPriceFilter();
            } catch (oError) {
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
            
            // Create deep backup copies of model data before enabling edit mode
            this._backupHostelModel = JSON.parse(JSON.stringify(oHostelModel.getData()));
            this._backupBookingView = JSON.parse(JSON.stringify(oBookingView.getData()));
            this._backupFacilityModel = JSON.parse(JSON.stringify(oFacilityModel.getData()));
            this._backupFacilitySelection = JSON.parse(JSON.stringify(oFacilitySelection.getData()));
            
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
                oHostelModel.setData(this._backupHostelModel);
            }
            if (this._backupBookingView) {
                oBookingView.setData(this._backupBookingView);
            }
            if (this._backupFacilityModel) {
                oFacilityModel.setData(this._backupFacilityModel);
            }
            if (this._backupFacilitySelection) {
                oFacilitySelection.setData(this._backupFacilitySelection);
            }
            
            // Reset facility carousel to first page
            this._iFacilityStartIndex = 0;
            
            // Re-render facility cards and sync with occupants
            this._renderFacilityCards();
            this._syncSelectedFacilityPersonsWithOccupants();
            
            // Ensure edit mode is disabled
            oBookingView.setProperty("/editModeEnabled", false);
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
