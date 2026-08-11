sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment",
    "../model/formatter",
    "../utils/validation"
], function (BaseController, JSONModel, MessageToast, MessageBox, Filter, FilterOperator, Fragment, Formatter, utils) {
    "use strict";

    return BaseController.extend("sap.ui.com.project1.controller.MyBookings", {
        Formatter: Formatter,

        onInit: function () {
            var oMyBookingsModel = new JSONModel(this._getInitialData());
            this.getView().setModel(oMyBookingsModel, "myBookings");
            this.getView().setModel(oMyBookingsModel, "profileData");
            this.getView().setModel(new JSONModel(this._getInitialComplaintData()), "complaintTemp");
            this.getView().setModel(new JSONModel({ mode: "CREATE" }), "viewModel");
            this.getView().setModel(new JSONModel({ visible: true }), "VisibleModel");
            this.getView().setModel(new JSONModel({}), "Member");
            this.getView().setModel(new JSONModel({
                focusedDate: new Date(2000, 0, 1),
                minDate: new Date(1950, 0, 1),
                maxdate: new Date()
            }), "controller");

            // Cache of member documents fetched on demand from
            // HM_Documentonly, keyed by MemberID.
            this._mMemberDocumentCache = {};

            this.getOwnerComponent().getRouter().getRoute("RouteMyBookings").attachMatched(this._onRouteMatched, this);
        },

        _getInitialData: function () {
            return {
                bookings: [],
                Members: [],
                Payments: [],
                complain: [],
                damage: [],
                bookingCount: 0,
                memberCount: 0,
                paymentCount: 0,
                complainCount: 0,
                damageCount: 0,
                BranchCombo: [],
                AsgnRoomNo: [],
                hasAssignedBooking: false,
                selectedTab: "Booking History"
            };
        },

        _getInitialComplaintData: function () {
            return {
                ComplaintID: "",
                ComplaintType: "",
                RoomNo: "",
                RoomCombo: [],
                Description: "",
                BranchCode: "",
                FileName: "",
                FileType: "",
                FileContent: "",
                Documents: [],
                isEditMode: false,
                BookingID: "",
                CustomerName: ""
            };
        },

        _onRouteMatched: async function () {
            var bLoggedIn = await this.commonLoginFunction("MyBookings");
            if (!bLoggedIn) {
                return;
            }

            this.byId("idMyBookingsTabHeader").setSelectedKey("Booking History");
            this.getView().getModel("myBookings").setProperty("/selectedTab", "Booking History");
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            await this._loadBookings();
        },

        _getLoggedInUser: function () {
            var oLoginModel = this.getView().getModel("LoginModel") || this.getOwnerComponent().getModel("LoginModel") || sap.ui.getCore().getModel("LoginModel");
            var oUserModel = this.getOwnerComponent().getModel("UserModel") || sap.ui.getCore().getModel("UserModel");
            var oUser = oLoginModel ? oLoginModel.getData() : {};
            var oFallbackUser = oUserModel ? oUserModel.getData() : {};

            return Object.assign({}, oFallbackUser, oUser);
        },

        _getLoggedInUserId: function () {
            var oUser = this._getLoggedInUser();

            return oUser.UserID || oUser.EmployeeID || "";
        },

        _clearCurrentSearch: function () {
            var oSearch = this.byId("idMyBookingsSearch");
            if (oSearch) {
                oSearch.setValue("");
            }
            this._filterCurrentTable([]);
        },

        _loadBookings: async function () {
            var oModel = this.getView().getModel("myBookings");
            var sUserID = this._getLoggedInUserId();

            if (!sUserID) {
                oModel.setProperty("/bookings", []);
                oModel.setProperty("/bookingCount", 0);
                MessageToast.show("User details not found");
                return;
            }

            this.getBusyDialog();

            try {
                var oResponse = await this.ajaxReadWithJQuery("CustomerAndPayment", { UserID: sUserID });
                var aBookings = (oResponse && oResponse.BookingData) || [];
                var mBranchGSTData = await this._loadBookingBranchGSTData(aBookings);
                var aBookingData = aBookings.map(function (oBooking) {
                    return this._normalizeBookingData(oBooking, mBranchGSTData);
                }.bind(this));

                oModel.setProperty("/bookings", aBookingData);
                oModel.setProperty("/bookingCount", aBookingData.length);
                oModel.setProperty("/BranchCombo", this._prepareBranchComboData(aBookings));
                oModel.setProperty("/AsgnRoomNo", this._prepareAssignedRoomData(aBookings));
                oModel.setProperty("/hasAssignedBooking", aBookings.some(function (oBooking) {
                    return String(oBooking.Status || "").toLowerCase() === "assigned";
                }));
            } catch (err) {
                oModel.setProperty("/bookings", []);
                oModel.setProperty("/bookingCount", 0);
                oModel.setProperty("/BranchCombo", []);
                oModel.setProperty("/AsgnRoomNo", []);
                oModel.setProperty("/hasAssignedBooking", false);
                MessageToast.show(err.message || err.responseText || "Unable to load booking history");
            } finally {
                this.closeBusyDialog();
            }
        },

        _loadMembers: async function (bKeepBusyOpen) {
            var oModel = this.getView().getModel("myBookings");
            var sUserID = this._getLoggedInUserId();

            if (!sUserID) {
                oModel.setProperty("/Members", []);
                oModel.setProperty("/memberCount", 0);
                MessageToast.show("User details not found");
                return;
            }

            if (!bKeepBusyOpen) {
                this.getBusyDialog();
            }

            try {
                var oResponse = await this.ajaxReadWithJQuery("HM_Memberonly", { UserID: sUserID });
                var aMembers = this._normalizeMemberData(oResponse);

                oModel.setProperty("/Members", aMembers);
                oModel.setProperty("/memberCount", aMembers.length);

                // Document attachments are now loaded on demand, so the cache
                // is reset whenever the lightweight list is (re)loaded.
                this._mMemberDocumentCache = {};
            } catch (err) {
                var aSelfMember = this._createSelfMemberRow(null);
                oModel.setProperty("/Members", aSelfMember ? [aSelfMember] : []);
                oModel.setProperty("/memberCount", aSelfMember ? 1 : 0);
                MessageToast.show(err.message || err.responseText || "Unable to load member details");
            } finally {
                if (!bKeepBusyOpen) {
                    this.closeBusyDialog();
                }
            }
        },

        _loadPayments: async function () {
            var oModel = this.getView().getModel("myBookings");
            var sUserID = this._getLoggedInUserId();

            if (!sUserID) {
                oModel.setProperty("/Payments", []);
                oModel.setProperty("/paymentCount", 0);
                MessageToast.show("User details not found");
                return;
            }

            this.getBusyDialog();

            try {
                var oResponse = await this.ajaxReadWithJQuery("HM_ManageInvoice", { UserID: sUserID });
                var aInvoiceData = Array.isArray(oResponse && oResponse.data) ? oResponse.data : ((oResponse && oResponse.data) ? [oResponse.data] : []);
                var aPayments = aInvoiceData.map(function (oInvoice) {
                    return {
                        BookingID: oInvoice.BookingID || oInvoice.BookingId || "",
                        CustomerName: oInvoice.CustomerName || "",
                        InvoiceDate: oInvoice.InvoiceDate || oInvoice.InvoiceDateString || "",
                        InvNo: oInvoice.InvNo || oInvoice.InvNumber || "",
                        TotalAmount: oInvoice.TotalAmount || oInvoice.GrandTotal || 0,
                        DueAmount: oInvoice.DueAmount || 0,
                        currency: oInvoice.Currency || oInvoice.currency || "",
                        PaymentGroup: oInvoice.Status || "Others"
                    };
                });

                oModel.setProperty("/Payments", aPayments);
                oModel.setProperty("/paymentCount", aPayments.length);
            } catch (err) {
                oModel.setProperty("/Payments", []);
                oModel.setProperty("/paymentCount", 0);
                MessageToast.show(err.message || err.responseText || "Unable to load payments");
            } finally {
                this.closeBusyDialog();
            }
        },

        onPressManageInvoice: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("myBookings");
            var oPayment = oContext && oContext.getObject();

            if (!oPayment || !oPayment.InvNo) {
                MessageToast.show("Invoice number not found for this payment");
                return;
            }

            this.getOwnerComponent().getRouter().navTo("RouteManageInvoiceDetails", {
                sPath: encodeURIComponent(oPayment.InvNo),
                dash: "MyBookings"
            });
        },

        _normalizeMemberData: function (oResponse) {
            var aMemberData = Array.isArray(oResponse && oResponse.data) ? oResponse.data : ((oResponse && oResponse.data) ? [oResponse.data] : []);
            var aMembers = aMemberData.map(function (oMember) {
                return this._createMemberRow(oMember);
            }.bind(this));
            var bHasSelf = aMembers.some(function (oMember) {
                return this._isSelfRelation(oMember.Relation);
            }.bind(this));
            var oSelfMember = bHasSelf ? null : this._createSelfMemberRow(aMemberData[0]);

            if (oSelfMember) {
                aMembers.unshift(oSelfMember);
            }

            return aMembers;
        },

        _createMemberRow: function (oMember) {
            return {
                Salutation: oMember.Salutation || "",
                Name: oMember.Name || "",
                DateOfBirth: oMember.DateOfBirth || "",
                Gender: oMember.Gender || "",
                Relation: this._normalizeRelation(oMember.Relation),
                BookingID: oMember.BookingID || "",
                MemberID: oMember.MemberID || "",
                UserID: oMember.UserID || ""
            };
        },

        _createSelfMemberRow: function (oFallbackMember) {
            var oUser = this._getLoggedInUser();
            var sName = oUser.UserName || oUser.EmployeeName || oUser.name || (oFallbackMember && oFallbackMember.Name) || "";
            var sUserID = oUser.UserID || oUser.EmployeeID || "";

            if (!sName && !sUserID) {
                return null;
            }

            return {
                Salutation: oUser.Salutation || (oFallbackMember && oFallbackMember.Salutation) || "",
                Name: sName,
                DateOfBirth: oUser.DateofBirth || oUser.DateOfBirth || (oFallbackMember && oFallbackMember.DateOfBirth) || "",
                Gender: oUser.Gender || (oFallbackMember && oFallbackMember.Gender) || "",
                Relation: "Self",
                BookingID: oFallbackMember && oFallbackMember.BookingID || "",
                MemberID: oUser.MemberID || sUserID,
                UserID: sUserID
            };
        },

        /**
         * Fetches the document of a single member on demand from
         * HM_Documentonly (filtered by MemberID). Responses are cached
         * per MemberID so repeat views/edits do not re-download the file.
         *
         * Only the MemberID of the pressed row is queried. There is no
         * UserID fallback: a member without a document must resolve to
         * "no document", never to the logged-in user's document.
         *
         * @param {string} sMemberID MemberID of the row (e.g. "00008_01")
         * @returns {Promise<object>} normalized document, or {} when none
         */
        _fetchMemberDocument: async function (sMemberID) {
            var sCacheKey = sMemberID || "";

            if (!sCacheKey) {
                return {};
            }

            if (!this._mMemberDocumentCache) {
                this._mMemberDocumentCache = {};
            }

            if (this._mMemberDocumentCache[sCacheKey]) {
                return this._mMemberDocumentCache[sCacheKey];
            }

            var oResponse = await this.ajaxReadWithJQuery("HM_Documentonly", {
                MemberID: sMemberID
            });

            var aDocuments = Array.isArray(oResponse && oResponse.Documents) ?
                oResponse.Documents :
                (Array.isArray(oResponse && oResponse.data) ? oResponse.data : []);

            // Guard against a backend that ignores/loosens the filter and
            // returns documents belonging to another member.
            var oDoc = (aDocuments || []).filter(function (oCandidate) {
                return !oCandidate.MemberID ||
                    String(oCandidate.MemberID) === String(sMemberID);
            })[0] || null;

            if (!oDoc) {
                // Cache the "no document" result as well so repeated clicks
                // on a member without an attachment do not re-hit the backend.
                this._mMemberDocumentCache[sCacheKey] = {};
                return {};
            }

            var oNormalized = {
                DocumentID: oDoc.DocumentID || "",
                DocumentType: oDoc.DocumentType || "",
                FileName: oDoc.FileName || "",
                FileType: oDoc.FileType || "",
                MemberID: oDoc.MemberID || sMemberID || "",
                UserID: oDoc.UserID || "",
                Attachment: this._fileToBase64(oDoc.File)
            };

            this._mMemberDocumentCache[sCacheKey] = oNormalized;

            return oNormalized;
        },

        /**
         * Converts a file payload coming from the backend (Node Buffer or
         * already base64 string) into plain base64.
         */
        _fileToBase64: function (oFile) {
            if (!oFile) {
                return "";
            }

            if (oFile.type === "Buffer" && Array.isArray(oFile.data)) {
                return this._bufferToBase64(oFile.data);
            }

            if (typeof oFile === "string") {
                return oFile;
            }

            return "";
        },

        _bufferToBase64: function (aBytes) {
            var aByteArray = new Uint8Array(aBytes);
            var iChunkSize = 8192;
            var sBinary = "";

            // Chunked so large attachments do not overflow the call stack.
            for (var i = 0; i < aByteArray.length; i += iChunkSize) {
                sBinary += String.fromCharCode.apply(null, aByteArray.subarray(i, i + iChunkSize));
            }

            return btoa(sBinary);
        },

        _formatDisplayDate: function (sDate) {
            if (!sDate) {
                return "";
            }

            var oDate = new Date(sDate);
            if (isNaN(oDate.getTime())) {
                return "";
            }

            return oDate.toLocaleDateString("en-GB");
        },

        _getBookingGroup: function (oBooking) {
            var oToday = new Date();
            oToday.setHours(0, 0, 0, 0);

            var oStartDate = oBooking.StartDate ? new Date(oBooking.StartDate) : null;
            var oEndDate = oBooking.EndDate ? new Date(oBooking.EndDate) : null;

            if (oStartDate) {
                oStartDate.setHours(0, 0, 0, 0);
            }
            if (oEndDate) {
                oEndDate.setHours(0, 0, 0, 0);
            }

            if (oBooking.Status === "Cancelled") {
                return "Cancelled";
            }
            if (oBooking.Status === "Completed") {
                return "Completed";
            }
            if (oBooking.Status === "New" || oBooking.Status === "Assigned" || oBooking.Status === "Confirmed") {
                if (oStartDate && oEndDate && oStartDate <= oToday && oEndDate >= oToday) {
                    return "Ongoing";
                }
                if (oStartDate && oStartDate > oToday) {
                    return "Upcoming";
                }
            }
            if (oBooking.Status === "Rejected") {
                return "Rejected";
            }

            return "Others";
        },

        _loadBookingBranchGSTData: async function (aBookings) {
            var aBranchIDs = Array.from(new Set((aBookings || []).map(function (oBooking) {
                return String(oBooking.BranchCode || "").trim();
            }).filter(Boolean)));
            var aBranchResponses = await Promise.all(aBranchIDs.map(async function (sBranchID) {
                var oBranch = {};

                try {
                    var oResponse = await this.ajaxReadWithJQuery("HM_BranchData", {
                        BranchID: sBranchID
                    });
                    var aBranches = Array.isArray(oResponse && oResponse.data)
                        ? oResponse.data
                        : (oResponse && oResponse.data ? [oResponse.data] : []);
                    oBranch = aBranches.find(function (oBranchData) {
                        return oBranchData.BranchID === sBranchID;
                    }) || aBranches[0] || {};
                } catch (oError) {
                    console.error("Unable to load GST data for branch " + sBranchID, oError);
                }

                return [sBranchID, oBranch];
            }.bind(this)));

            return Object.fromEntries(aBranchResponses);
        },

        _calculateBookingAmount: function (oBooking, oBranchData) {
            var nGstValue = 0;
            var sGSTType = String(oBranchData && oBranchData.Type || "").trim().toUpperCase();
            var nBranchGSTValue = Number(oBranchData && oBranchData.Value || 0);

            if (sGSTType === "IGST") {
                nGstValue = nBranchGSTValue / 100;
            } else if (sGSTType === "CGST/SGST") {
                nGstValue = (nBranchGSTValue + nBranchGSTValue) / 100;
            }

            return (((Number(oBooking.TotalRoomprice || 0) + Number(oBooking.FacilityPrice || 0)) - Number(oBooking.Discount || 0)) * (1 + nGstValue)).toString();
        },

        _normalizeBookingData: function (oBooking, mBranchGSTData) {
            var sCustomerName = [
                oBooking.Salutation || "",
                oBooking.CustomerName || ""
            ].join(" ").trim();
            var sBranchCode = String(oBooking.BranchCode || "").trim();
            var oBranchData = mBranchGSTData && mBranchGSTData[sBranchCode] || {};

            return {
                bookingGroup: this._getBookingGroup(oBooking),
                customerName: sCustomerName,
                BookingID: oBooking.BookingID ? oBooking.BookingID.toString() : "",
                MemberID: oBooking.MemberID || "",
                BookingDate: this._formatDisplayDate(oBooking.BookingDate),
                BookingDateSort: oBooking.BookingDate ? new Date(oBooking.BookingDate).getTime() : 0,
                room: oBooking.BedType || oBooking.RoomName || oBooking.RoomNumber || oBooking.RoomNo || "",
                RoomNo: String(oBooking.RoomNo || "").trim(),
                amount: this._calculateBookingAmount(oBooking, oBranchData),
                currency: oBooking.Currency || "INR",
                status: oBooking.Status || oBooking.BookingStatus || "",
                BranchCode: sBranchCode,
                GSTIN: oBranchData.GSTIN || "",
                GSTType: oBranchData.Type || "",
                GSTValue: oBranchData.Value || 0
            };
        },

        onTableSelect: async function (oEvent) {
            var sKey = oEvent ? oEvent.getParameter("key") : "Booking History";
            this.getView().getModel("myBookings").setProperty("/selectedTab", sKey);
            this._clearCurrentSearch();

            if (sKey === "Members") {
                await this._loadMembers();
            } else if (sKey === "Payment") {
                await this._loadPayments();
            } else if (sKey === "Complaints") {
                await this._loadComplaints();
            } else if (sKey === "Damage") {
                await this._loadDamage();
            } else {
                await this._loadBookings();
            }

            this._updateRowCount();
        },

        onTableUpdateFinished: function () {
            this._updateRowCount();
        },

        _getActiveTable: function (sSelectedTab) {
            if (sSelectedTab === "Members") {
                return this.byId("Id_MyBookingMemberTable");
            }
            if (sSelectedTab === "Payment") {
                return this.byId("Id_PaymentTable1");
            }
            if (sSelectedTab === "Complaints") {
                return this.byId("Id_MyBookingComplaintTable");
            }
            if (sSelectedTab === "Damage") {
                return this.byId("Id_MyBookingDamageTable");
            }
            return this.byId("Id_MyBookingTable");
        },

        _getCountPath: function (sSelectedTab) {
            if (sSelectedTab === "Members") {
                return "/memberCount";
            }
            if (sSelectedTab === "Payment") {
                return "/paymentCount";
            }
            if (sSelectedTab === "Complaints") {
                return "/complainCount";
            }
            if (sSelectedTab === "Damage") {
                return "/damageCount";
            }
            return "/bookingCount";
        },

        _getSearchFilters: function (sSelectedTab, sQuery) {
            if (sSelectedTab === "Members") {
                return this._getMemberSearchFilters(sQuery);
            }
            if (sSelectedTab === "Payment") {
                return this._getPaymentSearchFilters(sQuery);
            }
            if (sSelectedTab === "Complaints") {
                return this._getComplaintSearchFilters(sQuery);
            }
            if (sSelectedTab === "Damage") {
                return this._getDamageSearchFilters(sQuery);
            }
            return this._getBookingSearchFilters(sQuery);
        },

        _updateRowCount: function () {
            var oModel = this.getView().getModel("myBookings");
            var sSelectedTab = oModel.getProperty("/selectedTab");
            var oTable = this._getActiveTable(sSelectedTab);
            var oBinding = oTable && oTable.getBinding("items");
            var iLength = oBinding ? oBinding.getLength() : 0;

            oModel.setProperty(this._getCountPath(sSelectedTab), iLength);
        },

        onGlobalSearch: function (oEvent) {
            var sQuery = (oEvent.getParameter("newValue") || "").toLowerCase();
            var oModel = this.getView().getModel("myBookings");
            var sSelectedTab = oModel.getProperty("/selectedTab");
            var oTable = this._getActiveTable(sSelectedTab);
            var oBinding = oTable && oTable.getBinding("items");
            var aFilters = [];

            if (!oBinding) {
                return;
            }

            if (sQuery) {
                aFilters = [new Filter({
                    filters: this._getSearchFilters(sSelectedTab, sQuery),
                    and: false
                })];
            }

            this._filterCurrentTable(aFilters);
            this._updateRowCount();
        },

        _filterCurrentTable: function (aFilters) {
            var oModel = this.getView().getModel("myBookings");
            var sSelectedTab = oModel.getProperty("/selectedTab");
            var oTable = this._getActiveTable(sSelectedTab);
            var oBinding = oTable && oTable.getBinding("items");

            if (oBinding) {
                oBinding.filter(aFilters || []);
            }
        },

        onRefresh: async function () {
            var sSelectedTab = this.getView().getModel("myBookings").getProperty("/selectedTab");

            if (sSelectedTab === "Members") {
                await this._loadMembers();
            } else if (sSelectedTab === "Payment") {
                await this._loadPayments();
            } else if (sSelectedTab === "Complaints") {
                await this._loadComplaints();
            } else if (sSelectedTab === "Damage") {
                await this._loadDamage();
            } else {
                await this._loadBookings();
            }

            this._updateRowCount();
        },

        _getBookingSearchFilters: function (sQuery) {
            return [
                new Filter("customerName", FilterOperator.Contains, sQuery),
                new Filter("BookingID", FilterOperator.Contains, sQuery),
                new Filter("BookingDate", FilterOperator.Contains, sQuery),
                new Filter("room", FilterOperator.Contains, sQuery),
                new Filter("status", FilterOperator.Contains, sQuery),
                new Filter("amount", FilterOperator.Contains, sQuery),
                new Filter("currency", FilterOperator.Contains, sQuery)
            ];
        },

        _getMemberSearchFilters: function (sQuery) {
            // DocumentType is no longer part of the member list data, it is
            // fetched on demand, so it cannot be searched here.
            return [
                new Filter("Salutation", FilterOperator.Contains, sQuery),
                new Filter("Name", FilterOperator.Contains, sQuery),
                new Filter("Relation", FilterOperator.Contains, sQuery),
                new Filter("BookingID", FilterOperator.Contains, sQuery)
            ];
        },

        _getPaymentSearchFilters: function (sQuery) {
            var fnAmountContains = function (vValue) {
                return String(vValue == null ? "" : vValue).toLowerCase().indexOf(sQuery) !== -1;
            };
            return [
                new Filter("BookingID", FilterOperator.Contains, sQuery),
                new Filter("CustomerName", FilterOperator.Contains, sQuery),
                new Filter("InvNo", FilterOperator.Contains, sQuery),
                new Filter("InvoiceDate", FilterOperator.Contains, sQuery),
                new Filter({ path: "TotalAmount", test: fnAmountContains }),
                new Filter({ path: "DueAmount", test: fnAmountContains }),
                new Filter("currency", FilterOperator.Contains, sQuery)
            ];
        },

        _getComplaintSearchFilters: function (sQuery) {
            return [
                new Filter("CustomerName", FilterOperator.Contains, sQuery),
                new Filter("BookingID", FilterOperator.Contains, sQuery),
                new Filter("ComplaintID", FilterOperator.Contains, sQuery),
                new Filter("ComplaintType", FilterOperator.Contains, sQuery),
                new Filter("BranchName", FilterOperator.Contains, sQuery),
                new Filter("RoomNo", FilterOperator.Contains, sQuery),
                new Filter("ComplaintDescription", FilterOperator.Contains, sQuery),
                new Filter("ComplaintStatus", FilterOperator.Contains, sQuery),
                new Filter("ComplaintRaisedDate", FilterOperator.Contains, sQuery),
                new Filter("ExpectedResolvedDate", FilterOperator.Contains, sQuery),
                new Filter("AssignedTo", FilterOperator.Contains, sQuery)
            ];
        },

        _getDamageSearchFilters: function (sQuery) {
            var fnValueContains = function (vValue) {
                return String(vValue == null ? "" : vValue).toLowerCase().indexOf(sQuery) !== -1;
            };
            return [
                new Filter("DamageID", FilterOperator.Contains, sQuery),
                new Filter("BookingID", FilterOperator.Contains, sQuery),
                new Filter("CustomerName", FilterOperator.Contains, sQuery),
                new Filter("BranchName", FilterOperator.Contains, sQuery),
                new Filter("RoomNo", FilterOperator.Contains, sQuery),
                new Filter("ItemName", FilterOperator.Contains, sQuery),
                new Filter("Type", FilterOperator.Contains, sQuery),
                new Filter("Description", FilterOperator.Contains, sQuery),
                new Filter({ path: "Quantity", test: fnValueContains }),
                new Filter({ path: "Cost", test: fnValueContains }),
                new Filter("Status", FilterOperator.Contains, sQuery)
            ];
        },

        onPressBookingRow: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("myBookings");
            var oBookingData = oContext && oContext.getObject();

            if (!oBookingData || !oBookingData.BookingID) {
                MessageToast.show("BookingID not found for this booking");
                return;
            }

            this.getOwnerComponent().getRouter().navTo("RouteEditBooking", {
                BookingID: encodeURIComponent(btoa(oBookingData.BookingID.toString())),
                MemberID: encodeURIComponent(btoa((oBookingData.MemberID || "").toString())),
                query: {
                    FromMyBookings: "true"
                }
            });
        },

        onViewMemberDocument: async function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("myBookings");
            var oMember = oContext && oContext.getObject();

            if (!oMember || !oMember.MemberID) {
                MessageToast.show("No document available");
                return;
            }

            // The member list is loaded without attachments, so the document
            // of this row is fetched here, on demand, strictly by its MemberID.
            var oDoc = {};

            this.getBusyDialog();
            try {
                oDoc = await this._fetchMemberDocument(oMember.MemberID);
            } catch (err) {
                MessageToast.show(err.message || err.responseText || "No document available");
                return;
            } finally {
                this.closeBusyDialog();
            }

            if (!oDoc || !oDoc.Attachment) {
                MessageToast.show("No document available");
                return;
            }

            this._previewDocument(oDoc);
        },

        onPressAddMember: function () {
            this._ensureMemberDialog();
            this._mode = "CREATE";
            this.getView().getModel("viewModel").setProperty("/mode", "CREATE");

            var sUserID = this._getLoggedInUserId();
            var oNewMember = {
                MemberID: this._generateMemberID(),
                UserID: sUserID,
                Salutation: "",
                Name: "",
                Relation: "",
                Gender: "",
                DateOfBirth: "",
                DocumentType: "",
                DocumentName: "",
                Document: "",
                File: "",
                FileType: "",
                DocumentFile: null
            };

            this.getView().setModel(new JSONModel(oNewMember), "Member");
            this._existingFileData = null;
            this._selectedFile = null;
            this._resetMemberDialogControls();
            this.UD_Dialog.open();
        },

        onEditMemberFromDialog: async function (oEvent) {
            this._ensureMemberDialog();
            this._mode = "UPDATE";
            this.getView().getModel("viewModel").setProperty("/mode", "UPDATE");

            var oContext = oEvent.getSource().getBindingContext("myBookings");
            var oData = oContext && oContext.getObject();

            if (!oData) {
                MessageToast.show("Member details not found");
                return;
            }

            // The table row may not carry UserID, fall back to the profile.
            var sEditUserID = oData.UserID || this._getLoggedInUserId() || "";

            // The member list is loaded without attachments, so the document
            // is fetched here, on demand, to keep UPDATE payloads intact.
            var oDoc = {};

            this.getBusyDialog();
            try {
                oDoc = await this._fetchMemberDocument(oData.MemberID);
            } catch (err) {
                // Dialog still opens; the document block is simply empty.
            } finally {
                this.closeBusyDialog();
            }

            this._existingFileData = {
                DocumentID: oDoc.DocumentID || "",
                MemberID: oData.MemberID || "",
                UserID: sEditUserID,
                FileName: oDoc.FileName || "",
                FileType: oDoc.FileType || "",
                File: oDoc.Attachment || "",
                DocumentType: oDoc.DocumentType || ""
            };

            this.getView().setModel(new JSONModel({
                MemberID: oData.MemberID || "",
                UserID: sEditUserID,
                Salutation: oData.Salutation || "",
                Name: oData.Name || "",
                Relation: this._normalizeRelation(oData.Relation),
                Gender: oData.Gender || "",
                DateOfBirth: this._formatDateForDialog(oData.DateOfBirth),
                DocumentType: oDoc.DocumentType || "",
                DocumentName: oDoc.FileName || "",
                Document: oDoc.Attachment || "",
                File: oDoc.Attachment || "",
                FileType: oDoc.FileType || "",
                DocumentFile: null
            }), "Member");

            this._resetMemberDialogControls(Object.assign({}, oData, {
                DocumentType: oDoc.DocumentType || "",
                FileName: oDoc.FileName || ""
            }));
            this.UD_Dialog.open();
        },

        _ensureMemberDialog: function () {
            if (!this.UD_Dialog) {
                this.UD_Dialog = sap.ui.xmlfragment("sap.ui.com.project1.fragment.Memberedit", this);
                this.getView().addDependent(this.UD_Dialog);
            }
        },

        _resetMemberDialogControls: function (oData) {
            var mValues = oData || {};
            var aIds = ["idSelect", "MM_id_MemberName", "MemberDOB", "MemberGenderCombo", "MemberRelationCombo", "idDocumentType", "MM_id_FileUploader"];

            aIds.forEach(function (sId) {
                var oControl = sap.ui.getCore().byId(sId);
                if (oControl && oControl.setValueState) {
                    oControl.setValueState("None");
                }
            });

            this._setCoreControlValue("idSelect", mValues.Salutation || "");
            this._setCoreControlValue("MM_id_MemberName", mValues.Name || "");
            this._setCoreControlValue("MemberDOB", this._formatDateForDialog(mValues.DateOfBirth));
            this._setCoreControlValue("MemberGenderCombo", mValues.Gender || "");
            this._setCoreControlValue("MemberRelationCombo", this._normalizeRelation(mValues.Relation));
            this._setCoreControlValue("idDocumentType", mValues.DocumentType || "");
            this._setCoreControlValue("MM_id_FileUploader", mValues.FileName || "");
        },

        _setCoreControlValue: function (sId, sValue) {
            var oControl = sap.ui.getCore().byId(sId);
            if (!oControl) {
                return;
            }
            if (oControl.setSelectedKey) {
                oControl.setSelectedKey(sValue || "");
            }
            if (oControl.setValue) {
                oControl.setValue(sValue || "");
            }
        },

        _formatDateForDialog: function (sDate) {
            if (!sDate) {
                return "";
            }
            if (String(sDate).indexOf("-") > -1) {
                return String(sDate).split("-").reverse().join("/");
            }
            return sDate;
        },

        _isSelfRelation: function (sRelation) {
            return String(sRelation || "").toUpperCase() === "SELF";
        },

        _normalizeRelation: function (sRelation) {
            return this._isSelfRelation(sRelation) ? "Self" : (sRelation || "");
        },

        onCloseDialog: function () {
            if (this.UD_Dialog) {
                this.UD_Dialog.close();
            }
        },

        onNewMemberSalutationChange: function (oEvent) {
            var oSalutation = oEvent.getSource();
            var sKey = oSalutation.getSelectedKey();
            var oGender = sap.ui.getCore().byId("MemberGenderCombo");

            oSalutation.setValueState("None");
            if (!oGender) {
                return;
            }

            oGender.setSelectedKey("");
            oGender.setEnabled(true);

            if (sKey === "Mr.") {
                oGender.setSelectedKey("Male");
                oGender.setEnabled(false);
            } else if (sKey === "Ms." || sKey === "Mrs.") {
                oGender.setSelectedKey("Female");
                oGender.setEnabled(false);
            }

            utils._LCstrictValidationSelect(oSalutation);
        },

        onNewMemberNameChange: function (oEvent) {
            return utils._LCvalidateName(oEvent);
        },

        onNewMemberDOBChange: function (oEvent) {
            return utils._LCvalidateDate(oEvent);
        },

        onNewMemberGenderChange: function (oEvent) {
            return utils._LCstrictValidationComboBox(oEvent);
        },

        onNewMemberRelationChange: function (oEvent) {
            return utils._LCstrictValidationComboBox(oEvent);
        },

        onNewMemberDocumentTypeChange: function (oEvent) {
            var oComboBox = oEvent.getSource();
            var sValue = String(oComboBox.getValue() || "").trim();

            // Drop any previous "file missing" error on the uploader,
            // savepress re-evaluates it.
            var oFileUploader = sap.ui.getCore().byId("MM_id_FileUploader");

            if (oFileUploader) {
                oFileUploader.setValueState("None");
            }

            if (!sValue) {
                oComboBox.setSelectedKey("");
                oComboBox.setValue("");
                oComboBox.setValueState("None");
                return true;
            }

            var bValid = utils._LCstrictValidationComboBox(oComboBox, "ID");

            if (bValid) {
                // The attached file is named after the document type
                // (see onFacilityFileChange). Read the key from the control
                // rather than the model, because selectionChange can fire
                // before the two-way binding has updated it.
                var sNewDocType = String(oComboBox.getSelectedKey() || "").trim();

                if (sNewDocType) {
                    this._syncMemberDocumentName(sNewDocType);
                }
            }

            return bValid;
        },

        /**
         * Renames the currently attached member document so its file name
         * matches the selected document type, preserving the extension.
         * Does nothing when no file is attached.
         *
         * @param {string} [sDocType] document type to use; falls back to the
         *                            value stored in the "Member" model
         */
        _syncMemberDocumentName: function (sDocType) {
            var oModel = this.getView().getModel("Member");

            if (!oModel) {
                return;
            }

            var sCurrentName = String(oModel.getProperty("/DocumentName") || "").trim();
            var sNewDocType = sDocType || String(oModel.getProperty("/DocumentType") || "").trim();

            if (!sCurrentName || !sNewDocType || sCurrentName === "Compressing...") {
                return;
            }

            var sExt = sCurrentName.indexOf(".") > -1 ? sCurrentName.split(".").pop().toLowerCase() : "";
            var sNewName = sNewDocType.toLowerCase().replace(/[^a-z0-9]/g, "_");

            if (sExt) {
                sNewName += "." + sExt;
            }

            if (sNewName === sCurrentName) {
                return;
            }

            oModel.setProperty("/DocumentName", sNewName);
            oModel.refresh(true);
        },

        onFacilityFileChange: async function (oEvent) {
            var oFileUploader = oEvent.getSource();
            var oModel = this.getView().getModel("Member");
            var oFile = oEvent.getParameter("files") && oEvent.getParameter("files")[0];
            var sDocType = oModel.getProperty("/DocumentType");
            var oProcessedFile;
            var nMaxSizeMB = 2;
            var nFileSizeMB;
            var bIsImage;
            var sExt;

            if (!oFile) {
                return;
            }
            if (!sDocType) {
                MessageToast.show("Please select document type first");
                oFileUploader.clear();
                return;
            }

            sExt = oFile.name && oFile.name.indexOf(".") > -1 ? oFile.name.split(".").pop().toLowerCase() : "";
            if (["jpg", "jpeg", "png", "webp", "pdf"].indexOf(sExt) < 0) {
                MessageToast.show("Only PDF, JPG, JPEG, PNG, WEBP allowed");
                oFileUploader.clear();
                return;
            }

            oProcessedFile = oFile;
            nFileSizeMB = oFile.size / (1024 * 1024);
            bIsImage = oFile.type.indexOf("image/") === 0;

            try {
                if (nFileSizeMB > nMaxSizeMB && bIsImage) {
                    if (typeof imageCompression === "undefined") {
                        throw new Error("Compression library missing");
                    }

                    oModel.setProperty("/DocumentName", "Compressing...");
                    oModel.setProperty("/Document", "");
                    oModel.setProperty("/File", "");
                    oModel.setProperty("/FileType", "");
                    oModel.setProperty("/ProcessingActive", true);
                    oModel.refresh(true);

                    this.getBusyDialog();
                    oProcessedFile = await imageCompression(oFile, {
                        maxSizeMB: 1.9,
                        maxWidthOrHeight: 1920,
                        useWebWorker: true,
                        initialQuality: 0.95
                    });
                    this.closeBusyDialog();
                } else if (nFileSizeMB > nMaxSizeMB && !bIsImage) {
                    MessageToast.show("Please upload a file under 2 MB.");
                    oFileUploader.clear();
                    return;
                }
            } catch (oError) {
                this.closeBusyDialog();
                oModel.setProperty("/DocumentName", "");
                oModel.setProperty("/ProcessingActive", false);
                oModel.refresh(true);
                MessageBox.error(oError.message || "Compression failed. Please try a smaller file.");
                oFileUploader.clear();
                return;
            }

            var oReader = new FileReader();
            oReader.onload = function () {
                var sBase64 = String(oReader.result || "").split(",")[1] || "";
                var sNewName = sDocType.toLowerCase().replace(/[^a-z0-9]/g, "_") + "." + sExt;

                oModel.setProperty("/DocumentName", sNewName);
                oModel.setProperty("/DocumentFile", oProcessedFile);
                oModel.setProperty("/Document", sBase64);
                oModel.setProperty("/File", sBase64);
                oModel.setProperty("/FileType", oProcessedFile.type || oFile.type || "");
                oModel.setProperty("/ProcessingActive", false);
                oModel.refresh(true);
                oFileUploader.setValueState("None");
                oFileUploader.clear();
            };
            oReader.onerror = function () {
                oModel.setProperty("/DocumentName", "");
                oModel.setProperty("/ProcessingActive", false);
                oModel.refresh(true);
                MessageBox.error("Unable to read selected file.");
                oFileUploader.clear();
            };
            oReader.readAsDataURL(oProcessedFile);
        },

        onMemberFileSizeExceed: function (oEvent) {
            MessageToast.show((oEvent.getParameter("fileName") || "File") + " exceeds the 2 MB size limit.");
            oEvent.getSource().clear();
        },

        onDeleteMemberDocument: function () {
            var oModel = this.getView().getModel("Member");
            oModel.setProperty("/DocumentName", "");
            oModel.setProperty("/DocumentFile", null);
            oModel.setProperty("/Document", "");
            oModel.setProperty("/File", "");
            oModel.setProperty("/FileType", "");
            oModel.setProperty("/DocumentType", "");
            oModel.refresh(true);

            var oFileUploader = sap.ui.getCore().byId("MM_id_FileUploader");
            if (oFileUploader) {
                oFileUploader.clear();
                oFileUploader.setValueState("None");
            }

            this._selectedFile = null;
        },

        onPreviewMemberDocument: function () {
            this._previewDocument(this.getView().getModel("Member").getData());
        },

        /**
         * Validates the document block of the member dialog.
         * Rule: if a File Type is selected in the ComboBox, an actual file
         * must be present (freshly uploaded or already attached in UPDATE mode).
         * Works for both CREATE and UPDATE flows.
         *
         * @param {object} oMember data of the "Member" model
         * @returns {boolean} true when valid, false when execution must stop
         */
        _validateMemberDocument: function (oMember) {
            var oFileUploader = sap.ui.getCore().byId("MM_id_FileUploader");
            var sDocumentType = String(oMember.DocumentType || "").trim();

            // A file is considered present if it was just uploaded
            // (Document/File/DocumentName filled by onFacilityFileChange)
            // or if it is the document already stored on the member.
            var bHasFile = !!(
                oMember.File ||
                oMember.Document ||
                oMember.DocumentName ||
                this._selectedFile
            );

            // File Type selected but nothing uploaded -> block
            if (sDocumentType && !bHasFile) {
                if (oFileUploader) {
                    oFileUploader.setValueState("Error");
                    oFileUploader.setValueStateText("Please upload a file for the selected document type");
                }

                MessageToast.show("Please upload a file for the selected document type \"" + sDocumentType + "\".");
                return false;
            }

            // File uploaded but no File Type selected -> block
            if (!sDocumentType && bHasFile) {
                MessageToast.show("Please select document type");
                return false;
            }

            if (oFileUploader) {
                oFileUploader.setValueState("None");
            }

            return true;
        },

        savepress: function () {
            var oCore = sap.ui.getCore();
            var oMember = this.getView().getModel("Member").getData();

            if (!(utils._LCstrictValidationComboBox(oCore.byId("idSelect"), "ID") &&
                    utils._LCvalidateName(oCore.byId("MM_id_MemberName"), "ID") &&
                    utils._LCvalidateDate(oCore.byId("MemberDOB"), "ID") &&
                    utils._LCstrictValidationComboBox(oCore.byId("MemberGenderCombo"), "ID") &&
                    (oMember.Relation === "Self" || utils._LCstrictValidationComboBox(oCore.byId("MemberRelationCombo"), "ID")) &&
                    utils._LCstrictValidationComboBox(oCore.byId("idDocumentType"), "ID"))) {
                MessageToast.show("Please fill mandatory fields");
                return;
            }

            if (!oMember.DocumentType) {
                MessageToast.show("Please select document type");
                return;
            }

            // File Type selected -> a file must actually be uploaded.
            // Applies to both CREATE and UPDATE.
            if (!this._validateMemberDocument(oMember)) {
                return;
            }

            if (this._mode === "CREATE" && !oMember.Document) {
                MessageToast.show("Please upload a document");
                return;
            }

            // UserID is mandatory in the payload. In UPDATE mode the table
            // row may not carry it, so fall back to the logged-in profile.
            var sUserID = oMember.UserID ||
                (this._existingFileData && this._existingFileData.UserID) ||
                this._getLoggedInUserId() ||
                "";

            var sDocumentID = this._mode === "UPDATE" ?
                ((this._existingFileData && this._existingFileData.DocumentID) || "") :
                "";

            this._uploadDocument({
                Members: [{
                    MemberID: oMember.MemberID,
                    Salutation: oMember.Salutation,
                    Name: oMember.Name,
                    Relation: oMember.Relation,
                    Gender: oMember.Gender,
                    UserID: sUserID,
                    DateOfBirth: oMember.DateOfBirth ? oMember.DateOfBirth.split("/").reverse().join("-") : "",
                    Documents: [{
                        DocumentID: sDocumentID,
                        MemberID: oMember.MemberID,
                        UserID: sUserID,
                        DocumentType: oMember.DocumentType,
                        FileName: oMember.DocumentName,
                        FileType: oMember.FileType,
                        File: oMember.File
                    }]
                }]
            }, sDocumentID);
        },

        _uploadDocument: async function (oDoc, sDocumentID) {
            var bCreate = this._mode === "CREATE";

            // Pass the DocumentID when one exists, otherwise an empty string.
            var sFilterDocumentID = sDocumentID ||
                (this._existingFileData && this._existingFileData.DocumentID) ||
                "";

            this.getBusyDialog();
            try {
                if (bCreate) {
                    await this.ajaxCreateWithJQuery("HM_MemberDocument", { data: [oDoc] });
                } else {
                    await this.ajaxUpdateWithJQuery("HM_MemberDocument", {
                        data: [oDoc],
                        filters: {
                            DocumentID: sFilterDocumentID
                        }
                    });
                }

                if (this.UD_Dialog) {
                    this.UD_Dialog.close();
                }

                // The stored document changed, so drop the cached copy for
                // this member to force a fresh HM_Documentonly fetch.
                var sMemberID = oDoc.Members && oDoc.Members[0] && oDoc.Members[0].MemberID;
                if (sMemberID && this._mMemberDocumentCache) {
                    delete this._mMemberDocumentCache[sMemberID];
                }

                this._selectedFile = null;
                this._existingFileData = null;
                MessageToast.show("Document uploaded successfully");
                await this._loadMembers(true);
            } catch (oError) {
                MessageToast.show(oError.message || oError.responseText || "Error uploading documents");
            } finally {
                this.closeBusyDialog();
            }
        },

        _generateMemberID: function () {
            var sUserID = this._getLoggedInUserId();
            var aMembers = this.getView().getModel("myBookings").getProperty("/Members") || [];
            var iMaxSuffix = 0;

            aMembers.forEach(function (oMember) {
                var sMemberID = String(oMember.MemberID || "");
                var aParts = sMemberID.split("_");
                var iSuffix = aParts.length === 2 && aParts[0] === sUserID ? parseInt(aParts[1], 10) : 0;

                if (!isNaN(iSuffix) && iSuffix > iMaxSuffix) {
                    iMaxSuffix = iSuffix;
                }
            });

            var sSuffix = iMaxSuffix + 1 < 10 ? "0" + (iMaxSuffix + 1) : String(iMaxSuffix + 1);
            return sUserID + "_" + sSuffix;
        },

        _previewDocument: async function (oDoc) {
            var sRawSource = String(oDoc.File || oDoc.Document || oDoc.Attachment || "").trim();
            var aDataUrlParts = /^data:([^;]+);base64,(.+)$/i.exec(sRawSource);
            var sRawBase64 = aDataUrlParts ? aDataUrlParts[2] : sRawSource;
            var sBase64 = this._normalizePreviewBase64(this._autoDecodePreviewBase64(sRawBase64));
            var sMimeType = String(oDoc.FileType || oDoc.MimeType || "").toLowerCase().trim();

            if (!sRawSource) {
                MessageToast.show("No document to preview.");
                return;
            }

            if (!sMimeType && aDataUrlParts) {
                sMimeType = aDataUrlParts[1];
            }

            sMimeType = this._normalizePreviewMimeType(sMimeType, sBase64);
            if (sMimeType === "application/octet-stream") {
                this._sPreviewBase64 = sBase64;
                this._sPreviewMimeType = sMimeType;
                this._sPreviewFileName = oDoc.FileName || oDoc.DocumentName || "Document Preview";
                this.onDownloadPreview();
                MessageToast.show("Unsupported document format. Download started if supported.");
                return;
            }

            this._sPreviewBase64 = sBase64;
            this._sPreviewMimeType = sMimeType;
            this._sPreviewFileName = oDoc.FileName || oDoc.DocumentName || "Document Preview";

            if (this._oPreviewDialog) {
                this._oPreviewDialog.destroy();
                this._oPreviewDialog = null;
            }

            this._oPreviewDialog = await sap.ui.core.Fragment.load({
                id: this.getView().getId(),
                name: "sap.ui.com.project1.fragment.DocumentPreview",
                controller: this
            });
            this.getView().addDependent(this._oPreviewDialog);

            var oDialog = sap.ui.core.Fragment.byId(this.getView().getId(), "previewDialog");
            var oImage = sap.ui.core.Fragment.byId(this.getView().getId(), "previewImage");
            var oHtml = sap.ui.core.Fragment.byId(this.getView().getId(), "previewHtml");

            oDialog.setTitle(this._sPreviewFileName);
            oImage.setVisible(false);
            oImage.setSrc("");
            oHtml.setVisible(false);
            oHtml.setContent("");

            if (this._pdfBlobUrl) {
                URL.revokeObjectURL(this._pdfBlobUrl);
                this._pdfBlobUrl = null;
            }

            if (sMimeType.indexOf("image/") === 0) {
                var sImageSrc = "data:" + sMimeType + ";base64," + sBase64;
                var oNativeImg = new Image();

                oNativeImg.onload = function () {
                    var nViewportWidth = window.innerWidth * 0.8;
                    var nViewportHeight = window.innerHeight * 0.8;
                    var nImageRatio = oNativeImg.width / oNativeImg.height;
                    var nFinalWidth = nViewportWidth;
                    var nFinalHeight = nViewportWidth / nImageRatio;

                    if (nFinalHeight > nViewportHeight) {
                        nFinalHeight = nViewportHeight;
                        nFinalWidth = nViewportHeight * nImageRatio;
                    }

                    oDialog.setContentWidth(nFinalWidth + "px");
                    oDialog.setContentHeight(nFinalHeight + "px");
                    oImage.setSrc(sImageSrc);
                    oImage.setVisible(true);
                    oDialog.open();
                };

                oNativeImg.onerror = function () {
                    MessageToast.show("Unable to preview image.");
                };

                oNativeImg.src = sImageSrc;
                return;
            }

            if (sMimeType === "application/pdf") {
                var sByteChars;
                var aByteArrays = [];

                try {
                    sByteChars = atob(sBase64);
                } catch (oError) {
                    MessageToast.show("PDF content is not valid base64.");
                    return;
                }

                for (var iOffset = 0; iOffset < sByteChars.length; iOffset += 512) {
                    var sSlice = sByteChars.slice(iOffset, iOffset + 512);
                    var aByteNumbers = new Array(sSlice.length);
                    for (var i = 0; i < sSlice.length; i++) {
                        aByteNumbers[i] = sSlice.charCodeAt(i);
                    }
                    aByteArrays.push(new Uint8Array(aByteNumbers));
                }
                this._pdfBlobUrl = URL.createObjectURL(new Blob(aByteArrays, { type: "application/pdf" }));

                if (sap.ui.Device.system.phone) {
                    this.onDownloadPreview();
                    MessageToast.show("File downloaded successfully");
                    return;
                }

                oHtml.setContent("<div style='width:100%;height:100%;overflow:hidden;display:flex;'><iframe src='" + this._pdfBlobUrl + "#toolbar=0&navpanes=0&scrollbar=0' style='border:none;width:100%;height:100%;display:block;overflow:hidden;' scrolling='auto' allowfullscreen></iframe></div>");
                oDialog.setContentWidth("85%");
                oDialog.setContentHeight("90%");
                oHtml.setVisible(true);
                oDialog.open();
                return;
            }

            this.onDownloadPreview();
        },

        _normalizePreviewBase64: function (sValue) {
            var sNormalized = String(sValue || "").replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/");
            var iRemainder = sNormalized.length % 4;

            if (iRemainder) {
                sNormalized += "=".repeat(4 - iRemainder);
            }

            return sNormalized;
        },

        _autoDecodePreviewBase64: function (sValue) {
            var sDecoded = String(sValue || "").replace(/\s/g, "");

            for (var i = 0; i < 5; i++) {
                try {
                    if (sDecoded.indexOf("iVB") === 0 || sDecoded.indexOf("/9j") === 0 || sDecoded.indexOf("JVBER") === 0 || sDecoded.indexOf("UklGR") === 0) {
                        return sDecoded;
                    }

                    sDecoded = atob(sDecoded);
                } catch (e) {
                    break;
                }
            }

            return sDecoded;
        },

        _normalizePreviewMimeType: function (sMimeType, sBase64) {
            var sType = String(sMimeType || "").toLowerCase().trim();

            if (sType === "pdf" || sType === ".pdf") {
                return "application/pdf";
            }
            if (sType === "jpg" || sType === "jpeg" || sType === ".jpg" || sType === ".jpeg") {
                return "image/jpeg";
            }
            if (sType === "png" || sType === ".png") {
                return "image/png";
            }
            if (sType === "webp" || sType === ".webp") {
                return "image/webp";
            }
            if (sType) {
                return sType;
            }
            if (sBase64.indexOf("iVB") === 0) {
                return "image/png";
            }
            if (sBase64.indexOf("/9j") === 0) {
                return "image/jpeg";
            }
            if (sBase64.indexOf("UklGR") === 0) {
                return "image/webp";
            }
            if (sBase64.indexOf("JVBER") === 0) {
                return "application/pdf";
            }

            return "application/octet-stream";
        },

        onDownloadPreview: function () {
            var sDownloadUrl;

            if (!this._sPreviewBase64) {
                MessageToast.show("No file available for download.");
                return;
            }

            sDownloadUrl = this._sPreviewMimeType === "application/pdf" && this._pdfBlobUrl ?
                this._pdfBlobUrl :
                "data:" + (this._sPreviewMimeType || "application/octet-stream") + ";base64," + this._sPreviewBase64;

            var oLink = document.createElement("a");
            oLink.href = sDownloadUrl;
            oLink.download = this._sPreviewFileName || "Document";
            document.body.appendChild(oLink);
            oLink.click();
            document.body.removeChild(oLink);
        },

        onClosePreview: function () {
            if (this._pdfBlobUrl) {
                URL.revokeObjectURL(this._pdfBlobUrl);
                this._pdfBlobUrl = null;
            }
            this._sPreviewBase64 = null;
            this._sPreviewMimeType = null;
            this._sPreviewFileName = null;

            if (this._oPreviewDialog) {
                this._oPreviewDialog.close();
                this._oPreviewDialog.destroy();
                this._oPreviewDialog = null;
            }
        },

        _prepareBranchComboData: function (aBookings) {
            var oBranchModel = this.getOwnerComponent().getModel("sBRModel");
            var aBranches = oBranchModel ? oBranchModel.getProperty("/") || [] : [];
            var aCodes = Array.from(new Set((aBookings || []).filter(function (oBooking) {
                return String(oBooking.Status || "").toLowerCase() === "assigned";
            }).map(function (oBooking) {
                return String(oBooking.BranchCode || "").trim();
            }).filter(Boolean)));

            return aCodes.map(function (sCode) {
                var oBranch = aBranches.find(function (oItem) {
                    return oItem.BranchID === sCode;
                });
                return {
                    BranchCode: sCode,
                    BranchName: oBranch && oBranch.Name || sCode
                };
            });
        },

        _prepareAssignedRoomData: function (aBookings) {
            var mRooms = {};

            return (aBookings || []).filter(function (oBooking) {
                return String(oBooking.Status || "").toLowerCase() === "assigned" && oBooking.BranchCode && oBooking.RoomNo;
            }).map(function (oBooking) {
                return {
                    BranchCode: String(oBooking.BranchCode).trim(),
                    RoomNo: String(oBooking.RoomNo).trim()
                };
            }).filter(function (oRoom) {
                var sKey = oRoom.BranchCode + "|" + oRoom.RoomNo;
                if (mRooms[sKey]) {
                    return false;
                }
                mRooms[sKey] = true;
                return true;
            });
        },

        _loadComplaints: async function (bSilent) {
            var oModel = this.getView().getModel("myBookings");
            var sUserID = this._getLoggedInUserId();

            if (!sUserID) {
                oModel.setProperty("/complain", []);
                oModel.setProperty("/complainCount", 0);
                if (!bSilent) {
                    MessageToast.show("User details not found");
                }
                return;
            }

            if (!bSilent) {
                this.getBusyDialog();
            }
            try {
                var oResponse = await this.ajaxReadWithJQuery("HM_Complaint", { UserID: sUserID });
                var aRaw = Array.isArray(oResponse && oResponse.data) ? oResponse.data :
                    (oResponse && oResponse.data ? [oResponse.data] :
                        (Array.isArray(oResponse && oResponse.ComplaintData) ? oResponse.ComplaintData :
                            (Array.isArray(oResponse && oResponse.commentData) ? oResponse.commentData : [])));
                var oBranchModel = this.getOwnerComponent().getModel("sBRModel");
                var aBranches = oBranchModel ? oBranchModel.getProperty("/") || [] : [];
                var aComplaints = aRaw.map(function (oComplaint) {
                    var sBranchCode = oComplaint.BranchCode || "";
                    var oBranch = aBranches.find(function (oItem) {
                        return oItem.BranchID === sBranchCode;
                    });
                    return {
                        BookingID: oComplaint.BookingID || "",
                        CustomerName: oComplaint.CustomerName || "",
                        ComplaintID: oComplaint.ComplaintID || oComplaint.ComplainID || oComplaint.ID || "",
                        ComplaintType: oComplaint.ComplaintType || "",
                        Description: oComplaint.Description || "",
                        ComplaintDescription: oComplaint.Description || "",
                        ComplaintRaisedDate: oComplaint.ComplaintRaisedDate || oComplaint.RaisedDate || "",
                        ComplaintStatus: oComplaint.Status || oComplaint.ComplaintStatus || "",
                        BranchCode: sBranchCode,
                        BranchName: oBranch && oBranch.Name || sBranchCode,
                        RoomNo: oComplaint.RoomNo || "",
                        FileName: oComplaint.FileName || "",
                        FileType: oComplaint.FileType || "",
                        File: oComplaint.File || "",
                        ExpectedResolvedDate: oComplaint.EstimatDate || oComplaint.ExpectedResolvedDate || "",
                        AssignedTo: oComplaint.AssignedBy || oComplaint.AssignedTo || ""
                    };
                });

                oModel.setProperty("/complain", aComplaints);
                oModel.setProperty("/complainCount", aComplaints.length);
            } catch (oError) {
                oModel.setProperty("/complain", []);
                oModel.setProperty("/complainCount", 0);
                if (!bSilent) {
                    MessageToast.show(oError.message || oError.responseText || "Unable to load complaints");
                }
            } finally {
                if (!bSilent) {
                    this.closeBusyDialog();
                }
            }
        },

        _loadDamage: async function (bSilent) {
            var oModel = this.getView().getModel("myBookings");
            var sUserID = this._getLoggedInUserId();

            if (!sUserID) {
                oModel.setProperty("/damage", []);
                oModel.setProperty("/damageCount", 0);
                if (!bSilent) {
                    MessageToast.show("User details not found");
                }
                return;
            }

            if (!bSilent) {
                this.getBusyDialog();
            }
            try {
                var oResponse = await this.ajaxReadWithJQuery("getHM_DamageBoth", { UserID: sUserID });
                var aHeaders = oResponse && oResponse.data && Array.isArray(oResponse.data.HM_Damage) ? oResponse.data.HM_Damage : [];
                var aItems = oResponse && oResponse.data && Array.isArray(oResponse.data.HM_DamageItem) ? oResponse.data.HM_DamageItem : [];
                var oBranchModel = this.getOwnerComponent().getModel("sBRModel");
                var aBranches = oBranchModel ? oBranchModel.getProperty("/") || [] : [];
                var mHeaders = new Map();
                var mItems = new Map();
                var aDamageRows = [];

                aHeaders.forEach(function (oHeader) {
                    var sDamageID = oHeader.DamageID || "";
                    var sBranchCode;
                    var oBranch;
                    if (!sDamageID) {
                        return;
                    }
                    sBranchCode = oHeader.BranchCode || "";
                    oBranch = aBranches.find(function (oItem) {
                        return oItem.BranchID === sBranchCode;
                    });
                    mHeaders.set(sDamageID, {
                        DamageID: sDamageID,
                        BookingID: oHeader.BookingID || "",
                        UserID: oHeader.UserID || "",
                        CustomerName: oHeader.CustomerName || "",
                        CustomerEmail: oHeader.CustomerEmail || "",
                        RoomNo: oHeader.RoomNo || "",
                        Currency: String(oHeader.Currency || "").trim(),
                        Status: oHeader.Status || "",
                        BedTypeName: oHeader.BedTypeName || "",
                        BranchCode: sBranchCode,
                        BranchName: oBranch && oBranch.Name || sBranchCode,
                        TotalCost: oHeader.TotalCost == null ? "" : oHeader.TotalCost,
                        ReturnDamageAmount: oHeader.ReturnDamageAmount == null ? "" : oHeader.ReturnDamageAmount,
                        ReturnDamageMode: oHeader.ReturnDamageMode == null ? "" : oHeader.ReturnDamageMode,
                        ReturnDamageTransactionID: oHeader.ReturnDamageTransactionID == null ? "" : oHeader.ReturnDamageTransactionID,
                        ReturnDamageDate: oHeader.ReturnDamageDate || null,
                        ReturningEmployeeName: oHeader.ReturningEmployeeName || "",
                        InvoiceDate: oHeader.InvoiceDate || null
                    });
                });

                aItems.forEach(function (oItem) {
                    var sDamageID = oItem.DamageID || "";
                    if (!sDamageID) {
                        return;
                    }
                    if (!mItems.has(sDamageID)) {
                        mItems.set(sDamageID, []);
                    }
                    mItems.get(sDamageID).push(oItem);
                });

                mHeaders.forEach(function (oHeader, sDamageID) {
                    var aDamageItems = mItems.get(sDamageID) || [];
                    if (!aDamageItems.length) {
                        aDamageRows.push(Object.assign({}, oHeader, {
                            ItemID: "",
                            ItemName: "",
                            Type: "",
                            Description: "",
                            Quantity: "",
                            Cost: "",
                            ItemCurrency: ""
                        }));
                        return;
                    }
                    aDamageItems.forEach(function (oItem) {
                        aDamageRows.push(Object.assign({}, oHeader, {
                            ItemID: oItem.ItemID || "",
                            ItemName: oItem.ItemName || "",
                            Type: oItem.Type || "",
                            Description: oItem.Description || "",
                            Quantity: oItem.Quantity == null ? "" : oItem.Quantity,
                            Cost: oItem.Cost == null ? "" : oItem.Cost,
                            ItemCurrency: String(oItem.Currency || "").trim()
                        }));
                    });
                });

                aItems.forEach(function (oItem) {
                    var sDamageID = oItem.DamageID || "";
                    if (sDamageID && !mHeaders.has(sDamageID)) {
                        aDamageRows.push({
                            DamageID: sDamageID,
                            BookingID: "",
                            CustomerName: "",
                            BranchCode: "",
                            BranchName: "",
                            RoomNo: "",
                            Status: "",
                            Currency: "",
                            TotalCost: "",
                            ItemID: oItem.ItemID || "",
                            ItemName: oItem.ItemName || "",
                            Type: oItem.Type || "",
                            Description: oItem.Description || "",
                            Quantity: oItem.Quantity == null ? "" : oItem.Quantity,
                            Cost: oItem.Cost == null ? "" : oItem.Cost,
                            ItemCurrency: String(oItem.Currency || "").trim()
                        });
                    }
                });

                oModel.setProperty("/damage", aDamageRows);
                oModel.setProperty("/damageCount", aDamageRows.length);
            } catch (oError) {
                oModel.setProperty("/damage", []);
                oModel.setProperty("/damageCount", 0);
                if (!bSilent) {
                    MessageToast.show(oError.message || oError.responseText || "Unable to load damage records");
                }
            } finally {
                if (!bSilent) {
                    this.closeBusyDialog();
                }
            }
        },

        _getComplaintControl: function (sId) {
            return sap.ui.getCore().byId(sId) || this.byId(sId);
        },

        _setComplaintRoomComboData: function (sBranchCode, sSelectedRoomNo) {
            var oModel = this.getView().getModel("myBookings");
            var oTempModel = this.getView().getModel("complaintTemp");
            var sBranch = String(sBranchCode || "").trim();
            var sRoomNo = String(sSelectedRoomNo || "").trim();
            var aRooms = (oModel.getProperty("/AsgnRoomNo") || []).filter(function (oRoom) {
                return oRoom.BranchCode === sBranch;
            }).map(function (oRoom) {
                return { RoomNo: oRoom.RoomNo };
            });

            oTempModel.setProperty("/RoomCombo", aRooms);
            if (aRooms.length === 1) {
                sRoomNo = aRooms[0].RoomNo;
            } else if (!aRooms.some(function (oRoom) { return oRoom.RoomNo === sRoomNo; })) {
                sRoomNo = "";
            }
            oTempModel.setProperty("/RoomNo", sRoomNo);

            var oRoomCombo = this._getComplaintControl("idComplaintRoom");
            if (oRoomCombo) {
                oRoomCombo.setEditable(aRooms.length !== 1);
            }

            // Re-filter Customer Name / Booking ID for the resolved room
            this._applyComplaintCustomerFilter(sRoomNo);
        },

        // Full (branch level) customer + booking list returned by the last search
        _getComplaintCustomerData: function () {
            return Array.isArray(this._aComplaintCustomerData) ?
                this._aComplaintCustomerData : [];
        },

        // BookingIDs of the logged-in user's assigned bookings for one room
        _getBookingIDsForRoom: function (sRoomNo) {
            var oModel = this.getView().getModel("myBookings");
            var aBookings = oModel && oModel.getProperty("/bookings") || [];
            var sRoom = String(sRoomNo || "").trim();
            var sBranch = String(this.BranchCode || "").trim();

            return aBookings.filter(function (oBooking) {
                return String(oBooking.RoomNo || "").trim() === sRoom &&
                    (!sBranch || String(oBooking.BranchCode || "").trim() === sBranch) &&
                    String(oBooking.status || "").toLowerCase() === "assigned";
            }).map(function (oBooking) {
                return String(oBooking.BookingID || "").trim();
            }).filter(Boolean);
        },

        // Sets key + lock state of a complaint ComboBox
        _syncComplaintCombo: function (sId, sKey, bLock) {
            var oCombo = this._getComplaintControl(sId);
            if (!oCombo) {
                return;
            }

            oCombo.setSelectedKey(sKey);
            oCombo.setValue(sKey);
            oCombo.setEditable(!bLock);

            if (sKey) {
                oCombo.setValueState("None");
            }
        },

        // Clears Customer Name / Booking ID and unlocks both ComboBoxes
        _clearComplaintCustomerBooking: function () {
            var oTempModel = this.getView().getModel("complaintTemp");
            if (oTempModel) {
                oTempModel.setProperty("/CustomerName", "");
                oTempModel.setProperty("/BookingID", "");
            }

            ["MP_id_AddCustComboBox", "MP_id_AddBooking"].forEach(function (sId) {
                var oCombo = this._getComplaintControl(sId);
                if (oCombo) {
                    oCombo.setSelectedKey("");
                    oCombo.setValue("");
                    oCombo.setEditable(true);
                    oCombo.setValueState("None");
                }
            }.bind(this));
        },

        /**
         * Filters the Customer Name + Booking ID ComboBoxes by the selected room.
         * When the filtered data leaves a single option, the field is auto filled
         * and locked (non editable), same behaviour as Branch / Room No.
         */
        _applyComplaintCustomerFilter: function (sRoomNo) {
            var oView = this.getView();
            var oTempModel = oView.getModel("complaintTemp");
            var aAll = this._getComplaintCustomerData();

            // Customer data not loaded yet â†’ nothing to filter
            if (!oTempModel || !aAll.length) {
                return;
            }

            var sRoom = String(sRoomNo || "").trim();

            var bRoomInData = aAll.some(function (oItem) {
                return String(oItem.RoomNo || "").trim() !== "";
            });

            var aFiltered;
            var aRoomBookingIDs;

            if (!sRoom) {
                aFiltered = aAll.slice();
            } else if (bRoomInData) {
                // Service already returns the room of every booking
                aFiltered = aAll.filter(function (oItem) {
                    return String(oItem.RoomNo || "").trim() === sRoom;
                });
            } else {
                // Fallback: resolve the room via the user's own booking list
                aRoomBookingIDs = this._getBookingIDsForRoom(sRoom);
                aFiltered = aRoomBookingIDs.length ?
                    aAll.filter(function (oItem) {
                        return aRoomBookingIDs.indexOf(String(oItem.BookingID || "").trim()) > -1;
                    }) : aAll.slice();
            }

            // Never leave the user with an empty dropdown
            if (!aFiltered.length) {
                aFiltered = aAll.slice();
            }

            var oCustomerModel = oView.getModel("customerbookingdata");
            if (!oCustomerModel) {
                oCustomerModel = new JSONModel([]);
                oView.setModel(oCustomerModel, "customerbookingdata");
            }
            oCustomerModel.setData(aFiltered);

            var aCustomers = [];
            var aBookingIDs = [];

            aFiltered.forEach(function (oItem) {
                var sCustomerName = oItem.CustomerName;
                var sBooking = oItem.BookingID;

                if (sCustomerName && aCustomers.indexOf(sCustomerName) < 0) {
                    aCustomers.push(sCustomerName);
                }
                if (sBooking && aBookingIDs.indexOf(sBooking) < 0) {
                    aBookingIDs.push(sBooking);
                }
            });

            var sCustomer = String(oTempModel.getProperty("/CustomerName") || "").trim();
            var sBookingID = String(oTempModel.getProperty("/BookingID") || "").trim();

            if (aFiltered.length === 1) {
                sCustomer = aFiltered[0].CustomerName || "";
                sBookingID = aFiltered[0].BookingID || "";
            } else {
                if (aCustomers.indexOf(sCustomer) < 0) {
                    sCustomer = aCustomers.length === 1 ? aCustomers[0] : "";
                }
                if (aBookingIDs.indexOf(sBookingID) < 0) {
                    sBookingID = aBookingIDs.length === 1 ? aBookingIDs[0] : "";
                }
            }

            oTempModel.setProperty("/CustomerName", sCustomer);
            oTempModel.setProperty("/BookingID", sBookingID);

            // Lock when only one value is possible for the picked room
            this._syncComplaintCombo("MP_id_AddCustComboBox", sCustomer, aCustomers.length === 1);
            this._syncComplaintCombo("MP_id_AddBooking", sBookingID, aBookingIDs.length === 1);
        },

        onPressRaiseComplaint: function () {
            this._openComplaintDialog();
        },

        _openComplaintDialog: function (oComplaint) {
            var oView = this.getView();
            var oModel = oView.getModel("myBookings");
            var oTempModel = oView.getModel("complaintTemp");
            var aBranches = oModel.getProperty("/BranchCombo") || [];
            var sBranchCode = oComplaint ? String(oComplaint.BranchCode || "").trim() : (aBranches.length === 1 ? aBranches[0].BranchCode : "");
            var sFile = oComplaint ? this._extractComplaintBase64(oComplaint.File) : "";
            var sFileName = oComplaint && oComplaint.FileName || "";
            var sFileType = oComplaint && oComplaint.FileType || "";
            var sSavedCustomer = oComplaint && String(oComplaint.CustomerName || "").trim() || "";
            var sSavedBookingID = oComplaint && String(oComplaint.BookingID || "").trim() || "";

            // Never reuse the previous dialog's customer/booking data
            this._aComplaintCustomerData = [];

            oTempModel.setData(Object.assign(this._getInitialComplaintData(), {
                ComplaintID: oComplaint && oComplaint.ComplaintID || "",
                ComplaintType: oComplaint && oComplaint.ComplaintType || "",
                RoomNo: oComplaint && oComplaint.RoomNo || "",
                Description: oComplaint && (oComplaint.Description || oComplaint.ComplaintDescription) || "",
                BranchCode: sBranchCode,
                CustomerName: sSavedCustomer,
                BookingID: sSavedBookingID,
                FileName: sFileName,
                FileType: sFileType,
                FileContent: sFile,
                Documents: sFileName ? [{ FileName: sFileName, DocumentType: sFileType, FileType: sFileType, File: sFile, Base64: sFile, size: Math.ceil(sFile.length * 0.75) }] : [],
                isEditMode: !!oComplaint
            }));
            this.BranchCode = sBranchCode;
            this._setComplaintRoomComboData(sBranchCode, oComplaint && oComplaint.RoomNo || "");

            var fnOpen = function () {
                this._oComplaintDialog.setTitle(oComplaint ? "Edit Complaint" : "Raise New Complaint");
                this._oComplaintDialog.open();
                this._resetComplaintValidationStates();

                var oBranchCombo = this._getComplaintControl("idBranchCombo");
                if (oBranchCombo) {
                    oBranchCombo.setEditable(aBranches.length !== 1);
                }

                // Controls only exist once the fragment is loaded, so apply the
                // room lock + customer/booking filter here as well
                var aRooms = oTempModel.getProperty("/RoomCombo") || [];
                var oRoomCombo = this._getComplaintControl("idComplaintRoom");
                if (oRoomCombo) {
                    oRoomCombo.setEditable(aRooms.length !== 1);
                }

                this._applyComplaintCustomerFilter(oTempModel.getProperty("/RoomNo"));

                // Keep whatever was saved on the complaint being edited
                // (lock state stays as decided by the filter)
                this._forceComplaintSelection("MP_id_AddCustComboBox", "/CustomerName", sSavedCustomer);
                this._forceComplaintSelection("MP_id_AddBooking", "/BookingID", sSavedBookingID);
            }.bind(this);

            var pCustomerData = sBranchCode ? this.onSearch() : Promise.resolve([]);
            pCustomerData.catch(function () {}).finally(function () {
                if (!this._oComplaintDialog) {
                    Fragment.load({
                        name: "sap.ui.com.project1.fragment.Complaint",
                        controller: this
                    }).then(function (oDialog) {
                        this._oComplaintDialog = oDialog;
                        oView.addDependent(oDialog);
                        fnOpen();
                    }.bind(this));
                } else {
                    fnOpen();
                }
            }.bind(this));
        },

        // Restores a saved value on a complaint ComboBox without touching its lock state
        _forceComplaintSelection: function (sId, sModelPath, sValue) {
            if (!sValue) {
                return;
            }

            var oTempModel = this.getView().getModel("complaintTemp");
            var oCombo = this._getComplaintControl(sId);

            if (oTempModel) {
                oTempModel.setProperty(sModelPath, sValue);
            }

            if (oCombo) {
                oCombo.setSelectedKey(sValue);
                oCombo.setValue(sValue);
                oCombo.setValueState("None");
            }
        },

        _extractComplaintBase64: function (vFile) {
            var aBytes = vFile && vFile.data && Array.isArray(vFile.data) ? vFile.data : vFile;
            if (!Array.isArray(aBytes)) {
                return typeof aBytes === "string" ? aBytes : "";
            }
            return this._bufferToBase64(aBytes);
        },

        onCloseComplaintDialog: function () {
            if (this._oComplaintDialog) {
                this._oComplaintDialog.close();
            }
            this.getView().getModel("complaintTemp").setData(this._getInitialComplaintData());

            // Drop cached customer data and unlock the dependent fields
            this._aComplaintCustomerData = [];
            this._clearComplaintCustomerBooking();

            var oRoomCombo = this._getComplaintControl("idComplaintRoom");
            if (oRoomCombo) {
                oRoomCombo.setEditable(true);
            }

            this._resetComplaintValidationStates();
        },

        _resetComplaintValidationStates: function () {
            ["idBranchCombo", "idComplaintType", "idComplaintRoom", "idComplaintDesc", "MP_id_AddCustComboBox", "MP_id_AddBooking"].forEach(function (sId) {
                var oControl = this._getComplaintControl(sId);
                if (oControl && oControl.setValueState) {
                    oControl.setValueState("None");
                }
            }.bind(this));
        },

        onComplaintTypeChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
        },

        onComplaintRoomChange: function (oEvent) {
            var bValid = utils._LCstrictValidationComboBox(oEvent);
            var oCombo = oEvent.getSource ? oEvent.getSource() : oEvent;
            var sRoomNo = bValid ? String(oCombo.getSelectedKey() || "").trim() : "";
            var oTempModel = this.getView().getModel("complaintTemp");

            if (oTempModel) {
                oTempModel.setProperty("/RoomNo", sRoomNo);
            }

            // Room cleared or invalid â†’ release the dependent fields
            if (!sRoomNo) {
                this._clearComplaintCustomerBooking();
                return;
            }

            // Narrow Customer Name + Booking ID to the picked room and lock
            // them when only one value remains
            this._applyComplaintCustomerFilter(sRoomNo);
        },

        onComplaintDescLiveChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
        },

        onComBranch: async function (oEvent) {
            var oCombo = oEvent.getSource();
            var bValid = utils._LCstrictValidationComboBox(oCombo, "ID");
            this.BranchCode = bValid ? oCombo.getSelectedKey() : "";

            // New branch â†’ drop cached customer/booking data and unlock dependents
            this._aComplaintCustomerData = [];
            this._clearComplaintCustomerBooking();

            this._setComplaintRoomComboData(this.BranchCode, "");
            this.getView().setModel(new JSONModel([]), "customerbookingdata");
            if (this.BranchCode) {
                await this.onSearch();
            }
        },

        onSearch: async function () {
            var sUserID = this._getLoggedInUserId();
            this.getBusyDialog();
            try {
                var oResponse = await this.ajaxReadWithJQuery("HM_CustomerReadCall", {
                    BranchCode: this.BranchCode,
                    UserID: sUserID,
                    Status: "Assigned"
                });
                var aData = Array.isArray(oResponse && oResponse.commentData) ? oResponse.commentData :
                    (oResponse && oResponse.commentData ? [oResponse.commentData] : []);
                aData = aData.map(function (oItem) {
                    return Object.assign({}, oItem, {
                        CustomerName: String(oItem.CustomerName || "").trim(),
                        BookingID: String(oItem.BookingID || "").trim(),
                        RoomNo: String(oItem.RoomNo || "").trim()
                    });
                });

                // Keep the unfiltered branch list for room based filtering
                this._aComplaintCustomerData = aData;

                this.getView().setModel(new JSONModel(aData), "customerbookingdata");

                // Narrow Customer Name / Booking ID to the selected room
                var oTempModel = this.getView().getModel("complaintTemp");
                this._applyComplaintCustomerFilter(oTempModel ? oTempModel.getProperty("/RoomNo") : "");

                return aData;
            } catch (oError) {
                MessageToast.show(oError.responseText || "Failed to load customer data");
                throw oError;
            } finally {
                this.closeBusyDialog();
            }
        },

        onChangeAddCustomer: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent);
            var sCustomer = oEvent.getSource().getSelectedKey();
            var aData = this.getView().getModel("customerbookingdata").getData() || [];
            var oSelected = aData.find(function (oItem) { return oItem.CustomerName === sCustomer; });
            if (oSelected) {
                this.getView().getModel("complaintTemp").setProperty("/CustomerName", oSelected.CustomerName);
                this.getView().getModel("complaintTemp").setProperty("/BookingID", oSelected.BookingID);
            }
        },

        onChangeBookingID: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent);
            var sBookingID = oEvent.getSource().getSelectedKey();
            var aData = this.getView().getModel("customerbookingdata").getData() || [];
            var oSelected = aData.find(function (oItem) { return oItem.BookingID === sBookingID; });
            if (oSelected) {
                this.getView().getModel("complaintTemp").setProperty("/BookingID", oSelected.BookingID);
                this.getView().getModel("complaintTemp").setProperty("/CustomerName", oSelected.CustomerName);
            }
        },

        onComplaintFileChange: async function (oEvent) {
            var oUploader = oEvent.getSource();
            var oFile = oEvent.getParameter("files") && oEvent.getParameter("files")[0];
            var aAllowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
            if (!oFile) {
                return;
            }
            if (oFile.type && aAllowedTypes.indexOf(oFile.type) < 0) {
                MessageToast.show("Only JPG, PNG & WEBP files are allowed.");
                oUploader.clear();
                return;
            }

            var oProcessedFile = oFile;
            try {
                if (oFile.size > 2 * 1024 * 1024) {
                    if (typeof imageCompression === "undefined") {
                        throw new Error("Compression library missing");
                    }
                    oProcessedFile = await imageCompression(oFile, { maxSizeMB: 1.9, maxWidthOrHeight: 1920, initialQuality: 0.95 });
                }
                var sBase64 = await new Promise(function (resolve, reject) {
                    var oReader = new FileReader();
                    oReader.onload = function () { resolve(String(oReader.result || "").split(",")[1] || ""); };
                    oReader.onerror = reject;
                    oReader.readAsDataURL(oProcessedFile);
                });
                var oType = this._getComplaintControl("idComplaintType");
                var sType = oType && oType.getValue() || "Complaint";
                var sExtension = oFile.name.indexOf(".") > -1 ? oFile.name.split(".").pop().toLowerCase() : "jpg";
                var sFileName = sType + "." + sExtension;
                var oTempModel = this.getView().getModel("complaintTemp");
                oTempModel.setProperty("/Documents", [{ FileName: sFileName, DocumentType: oProcessedFile.type, FileType: oProcessedFile.type, File: sBase64, Base64: sBase64, size: oProcessedFile.size }]);
                oTempModel.setProperty("/FileName", sFileName);
                oTempModel.setProperty("/FileType", oProcessedFile.type);
                oTempModel.setProperty("/FileContent", sBase64);
            } catch (oError) {
                MessageBox.error(oError.message || "Compression failed. Please try a smaller file.");
            } finally {
                oUploader.clear();
            }
        },

        onComplaintDeleteDoc: function () {
            var oTempModel = this.getView().getModel("complaintTemp");
            oTempModel.setProperty("/Documents", []);
            oTempModel.setProperty("/FileName", "");
            oTempModel.setProperty("/FileType", "");
            oTempModel.setProperty("/FileContent", "");
        },

        onComplaintPreviewDoc: function (oEvent) {
            var oDocument = oEvent.getSource().getBindingContext("complaintTemp").getObject();
            this._previewDocument({
                File: oDocument.File || oDocument.Base64,
                FileName: oDocument.FileName,
                FileType: oDocument.FileType || oDocument.DocumentType
            });
        },

        onSaveComplaint: async function () {
            var oTempModel = this.getView().getModel("complaintTemp");
            var oData = oTempModel.getData();
            var oBranch = this._getComplaintControl("idBranchCombo");
            var oRoom = this._getComplaintControl("idComplaintRoom");
            var oCustomer = this._getComplaintControl("MP_id_AddCustComboBox");
            var oBooking = this._getComplaintControl("MP_id_AddBooking");
            var oType = this._getComplaintControl("idComplaintType");
            var oDescription = this._getComplaintControl("idComplaintDesc");

            if (!utils._LCstrictValidationComboBox(oBranch, "ID") ||
                !utils._LCstrictValidationComboBox(oRoom, "ID") ||
                !utils._LCstrictValidationComboBox(oCustomer, "ID") ||
                !utils._LCstrictValidationComboBox(oBooking, "ID") ||
                !utils._LCvalidateMandatoryField(oType, "ID") ||
                !utils._LCvalidateMandatoryField(oDescription, "ID")) {
                MessageToast.show("Please fill all required fields.");
                return;
            }

            var oUser = this._getLoggedInUser();
            var oComplaintData = {
                UserID: this._getLoggedInUserId(),
                RaisedBy: oUser.UserName || oUser.EmployeeName || "",
                ComplaintType: oType.getValue(),
                Description: oData.Description,
                Status: "Pending",
                ComplaintRaisedDate: new Date().toISOString().split("T")[0],
                RoomNo: oData.RoomNo,
                BranchCode: oBranch.getSelectedKey(),
                FileName: oData.FileName || "",
                FileType: oData.FileType || "",
                File: oData.FileContent || "",
                BookingID: oData.BookingID,
                CustomerName: oData.CustomerName
            };

            this.getBusyDialog();
            try {
                if (oData.ComplaintID) {
                    await this.ajaxUpdateWithJQuery("HM_Complaint", {
                        data: {
                            ComplaintType: oComplaintData.ComplaintType,
                            Description: oComplaintData.Description,
                            RoomNo: oComplaintData.RoomNo,
                            BranchCode: oComplaintData.BranchCode,
                            FileName: oComplaintData.FileName,
                            FileType: oComplaintData.FileType,
                            File: oComplaintData.File
                        },
                        filters: { ComplaintID: oData.ComplaintID }
                    });
                } else {
                    await this.ajaxCreateWithJQuery("HM_Complaint", { data: oComplaintData });
                }
                this._oComplaintDialog.close();
                MessageToast.show(oData.ComplaintID ? "Complaint updated successfully" : "Complaint saved successfully");
                this.getView().getModel("myBookings").setProperty("/selectedTab", "Complaints");
                this.byId("idMyBookingsTabHeader").setSelectedKey("Complaints");
                await this._loadComplaints(true);
            } catch (oError) {
                MessageToast.show(oError.message || oError.responseText || "Error saving complaint");
            } finally {
                this.closeBusyDialog();
            }
        },

        onPressComplaintRow: function (oEvent) {
            var oComplaint = oEvent.getSource().getBindingContext("myBookings").getObject();
            var sStatus = String(oComplaint.ComplaintStatus || "").trim().toLowerCase();
            if (["in progress", "resolved"].indexOf(sStatus) > -1) {
                MessageToast.show("Complaints with status 'In Progress' or 'Resolved' cannot be edited");
                return;
            }
            this._openComplaintDialog(oComplaint);
        },

        onExit: function () {
            if (this._oComplaintDialog) {
                this._oComplaintDialog.destroy();
                this._oComplaintDialog = null;
            }
            if (this.UD_Dialog) {
                this.UD_Dialog.destroy();
                this.UD_Dialog = null;
            }
            if (this._oPreviewDialog) {
                this._oPreviewDialog.destroy();
                this._oPreviewDialog = null;
            }
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("TilePage");
        },

        onLogPress: function () {
            this.CommonLogoutFunction();
        }
    });
});
