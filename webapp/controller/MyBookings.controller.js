sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "../model/formatter",
    "../utils/validation"
], function (BaseController, JSONModel, MessageToast, MessageBox, Filter, FilterOperator, Formatter, utils) {
    "use strict";

    return BaseController.extend("sap.ui.com.project1.controller.MyBookings", {
        Formatter: Formatter,

        onInit: function () {
            this.getView().setModel(new JSONModel(this._getInitialData()), "myBookings");
            this.getView().setModel(new JSONModel({ mode: "CREATE" }), "viewModel");
            this.getView().setModel(new JSONModel({ visible: true }), "VisibleModel");
            this.getView().setModel(new JSONModel({}), "Member");
            this.getView().setModel(new JSONModel({
                focusedDate: new Date(2000, 0, 1),
                minDate: new Date(1950, 0, 1),
                maxdate: new Date()
            }), "controller");
            this.getOwnerComponent().getRouter().getRoute("RouteMyBookings").attachMatched(this._onRouteMatched, this);
        },

        _getInitialData: function () {
            return {
                bookings: [],
                Members: [],
                bookingCount: 0,
                memberCount: 0,
                selectedTab: "Booking History"
            };
        },

        _onRouteMatched: async function () {
            var bLoggedIn = await this.commonLoginFunction("MyBookings");
            if (!bLoggedIn) {
                return;
            }

            this.byId("idMyBookingsTabHeader").setSelectedKey("Booking History");
            this.getView().getModel("myBookings").setProperty("/selectedTab", "Booking History");
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
                var aBookingData = aBookings.map(this._normalizeBookingData.bind(this));

                oModel.setProperty("/bookings", aBookingData);
                oModel.setProperty("/bookingCount", aBookingData.length);
            } catch (err) {
                oModel.setProperty("/bookings", []);
                oModel.setProperty("/bookingCount", 0);
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
                var oResponse = await this.ajaxReadWithJQuery("HM_MemberDocument", { UserID: sUserID });
                var aMembers = this._normalizeMemberData(oResponse);

                oModel.setProperty("/Members", aMembers);
                oModel.setProperty("/memberCount", aMembers.length);
            } catch (err) {
                var aSelfMember = this._createSelfMemberRow([], null);
                oModel.setProperty("/Members", aSelfMember ? [aSelfMember] : []);
                oModel.setProperty("/memberCount", aSelfMember ? 1 : 0);
                MessageToast.show(err.message || err.responseText || "Unable to load member details");
            } finally {
                if (!bKeepBusyOpen) {
                    this.closeBusyDialog();
                }
            }
        },

        _normalizeMemberData: function (oResponse) {
            var aMemberData = Array.isArray(oResponse && oResponse.data) ? oResponse.data : ((oResponse && oResponse.data) ? [oResponse.data] : []);
            var aUserDocuments = aMemberData[0] && Array.isArray(aMemberData[0].Documents) ? aMemberData[0].Documents : [];
            var aMembers = aMemberData.map(function (oMember) {
                return this._createMemberRow(oMember, aUserDocuments);
            }.bind(this));
            var bHasSelf = aMembers.some(function (oMember) {
                return this._isSelfRelation(oMember.Relation);
            }.bind(this));
            var oSelfMember = bHasSelf ? null : this._createSelfMemberRow(aUserDocuments, aMemberData[0]);

            if (oSelfMember) {
                aMembers.unshift(oSelfMember);
            }

            return aMembers;
        },

        _createMemberRow: function (oMember, aUserDocuments) {
            var oDoc = {};
            var sAttachment = "";

            if (oMember.Documents && oMember.Documents.length > 0) {
                oDoc = oMember.Documents[0];
            } else if (this._isSelfRelation(oMember.Relation) && aUserDocuments.length > 0) {
                oDoc = aUserDocuments[0];
            }

            if (oDoc.File) {
                if (oDoc.File.type === "Buffer" && Array.isArray(oDoc.File.data)) {
                    sAttachment = this._bufferToBase64(oDoc.File.data);
                } else if (typeof oDoc.File === "string") {
                    sAttachment = oDoc.File;
                }
            }

            return {
                Salutation: oMember.Salutation || "",
                Name: oMember.Name || "",
                DateOfBirth: oMember.DateOfBirth || "",
                Gender: oMember.Gender || "",
                Relation: this._normalizeRelation(oMember.Relation),
                BookingID: oMember.BookingID || "",
                DocumentType: oDoc.DocumentType || "",
                MemberID: oMember.MemberID || "",
                DocumentID: oDoc.DocumentID || "",
                UserID: oDoc.UserID || "",
                Attachment: sAttachment,
                FileName: oDoc.FileName || "",
                FileType: oDoc.FileType || ""
            };
        },

        _createSelfMemberRow: function (aUserDocuments, oFallbackMember) {
            var oUser = this._getLoggedInUser();
            var oDoc = Array.isArray(aUserDocuments) && aUserDocuments.length > 0 ? aUserDocuments[0] : {};
            var sName = oUser.UserName || oUser.EmployeeName || oUser.name || (oFallbackMember && oFallbackMember.Name) || "";
            var sAttachment = "";

            if (!sName && !oUser.UserID && !oUser.EmployeeID) {
                return null;
            }

            if (oDoc.File) {
                if (oDoc.File.type === "Buffer" && Array.isArray(oDoc.File.data)) {
                    sAttachment = this._bufferToBase64(oDoc.File.data);
                } else if (typeof oDoc.File === "string") {
                    sAttachment = oDoc.File;
                }
            } else if (oUser.FileContent) {
                sAttachment = oUser.FileContent;
            }

            return {
                Salutation: oUser.Salutation || (oFallbackMember && oFallbackMember.Salutation) || "",
                Name: sName,
                DateOfBirth: oUser.DateofBirth || oUser.DateOfBirth || (oFallbackMember && oFallbackMember.DateOfBirth) || "",
                Gender: oUser.Gender || (oFallbackMember && oFallbackMember.Gender) || "",
                Relation: "Self",
                BookingID: oFallbackMember && oFallbackMember.BookingID || "",
                DocumentType: oDoc.DocumentType || "",
                MemberID: oUser.MemberID || "SELF",
                DocumentID: oDoc.DocumentID || "",
                UserID: oUser.UserID || oUser.EmployeeID || "",
                Attachment: sAttachment,
                FileName: oDoc.FileName || "",
                FileType: oDoc.FileType || ""
            };
        },

        _bufferToBase64: function (aBytes) {
            var sBinary = "";
            var aByteArray = new Uint8Array(aBytes);

            for (var i = 0; i < aByteArray.length; i++) {
                sBinary += String.fromCharCode(aByteArray[i]);
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

        _calculateBookingAmount: function (oBooking) {
            var nGstValue = 0;

            if (oBooking.GSTType === "IGST") {
                nGstValue = Number(oBooking.GSTValue || 0) / 100;
            } else {
                nGstValue = (Number(oBooking.GSTValue || 0) + Number(oBooking.GSTValue || 0)) / 100;
            }

            return (((Number(oBooking.TotalRoomprice || 0) + Number(oBooking.FacilityPrice || 0)) - Number(oBooking.Discount || 0)) * (1 + nGstValue)).toString();
        },

        _normalizeBookingData: function (oBooking) {
            var sCustomerName = [
                oBooking.Salutation || "",
                oBooking.CustomerName || ""
            ].join(" ").trim();

            return {
                bookingGroup: this._getBookingGroup(oBooking),
                customerName: sCustomerName,
                BookingID: oBooking.BookingID ? oBooking.BookingID.toString() : "",
                MemberID: oBooking.MemberID || "",
                BookingDate: this._formatDisplayDate(oBooking.BookingDate),
                BookingDateSort: oBooking.BookingDate ? new Date(oBooking.BookingDate).getTime() : 0,
                room: oBooking.BedType || oBooking.RoomName || oBooking.RoomNumber || oBooking.RoomNo || "",
                amount: this._calculateBookingAmount(oBooking),
                currency: oBooking.Currency || "INR",
                status: oBooking.Status || oBooking.BookingStatus || ""
            };
        },

        onTableSelect: async function (oEvent) {
            var sKey = oEvent ? oEvent.getParameter("key") : "Booking History";
            this.getView().getModel("myBookings").setProperty("/selectedTab", sKey);
            this._clearCurrentSearch();

            if (sKey === "Members") {
                await this._loadMembers();
            } else {
                await this._loadBookings();
            }

            this._updateRowCount();
        },

        onTableUpdateFinished: function () {
            this._updateRowCount();
        },

        _updateRowCount: function () {
            var oModel = this.getView().getModel("myBookings");
            var sSelectedTab = oModel.getProperty("/selectedTab");
            var oTable = sSelectedTab === "Members" ? this.byId("Id_MyBookingMemberTable") : this.byId("Id_MyBookingTable");
            var oBinding = oTable && oTable.getBinding("items");
            var iLength = oBinding ? oBinding.getLength() : 0;

            oModel.setProperty(sSelectedTab === "Members" ? "/memberCount" : "/bookingCount", iLength);
        },

        onGlobalSearch: function (oEvent) {
            var sQuery = (oEvent.getParameter("newValue") || "").toLowerCase();
            var oModel = this.getView().getModel("myBookings");
            var sSelectedTab = oModel.getProperty("/selectedTab");
            var oTable = sSelectedTab === "Members" ? this.byId("Id_MyBookingMemberTable") : this.byId("Id_MyBookingTable");
            var oBinding = oTable && oTable.getBinding("items");
            var aFilters = [];

            if (!oBinding) {
                return;
            }

            if (sQuery) {
                aFilters = [new Filter({
                    filters: sSelectedTab === "Members" ? this._getMemberSearchFilters(sQuery) : this._getBookingSearchFilters(sQuery),
                    and: false
                })];
            }

            this._filterCurrentTable(aFilters);
            this._updateRowCount();
        },

        _filterCurrentTable: function (aFilters) {
            var oModel = this.getView().getModel("myBookings");
            var sSelectedTab = oModel.getProperty("/selectedTab");
            var oTable = sSelectedTab === "Members" ? this.byId("Id_MyBookingMemberTable") : this.byId("Id_MyBookingTable");
            var oBinding = oTable && oTable.getBinding("items");

            if (oBinding) {
                oBinding.filter(aFilters || []);
            }
        },

        onRefresh: async function () {
            var sSelectedTab = this.getView().getModel("myBookings").getProperty("/selectedTab");

            if (sSelectedTab === "Members") {
                await this._loadMembers();
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
            return [
                new Filter("Salutation", FilterOperator.Contains, sQuery),
                new Filter("Name", FilterOperator.Contains, sQuery),
                new Filter("Relation", FilterOperator.Contains, sQuery),
                new Filter("BookingID", FilterOperator.Contains, sQuery),
                new Filter("DocumentType", FilterOperator.Contains, sQuery)
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

        onViewMemberDocument: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("myBookings");
            var oMember = oContext && oContext.getObject();

            if (!oMember || !oMember.Attachment) {
                MessageToast.show("No document available");
                return;
            }

            this._previewDocument(oMember);
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

        onEditMemberFromDialog: function (oEvent) {
            this._ensureMemberDialog();
            this._mode = "UPDATE";
            this.getView().getModel("viewModel").setProperty("/mode", "UPDATE");

            var oContext = oEvent.getSource().getBindingContext("myBookings");
            var oData = oContext && oContext.getObject();

            if (!oData) {
                MessageToast.show("Member details not found");
                return;
            }

            this._existingFileData = {
                DocumentID: oData.DocumentID || "",
                MemberID: oData.MemberID || "",
                UserID: oData.UserID || "",
                FileName: oData.FileName || "",
                FileType: oData.FileType || "",
                File: oData.Attachment || "",
                DocumentType: oData.DocumentType || ""
            };

            this.getView().setModel(new JSONModel({
                MemberID: oData.MemberID || "",
                UserID: oData.UserID || this._getLoggedInUserId(),
                Salutation: oData.Salutation || "",
                Name: oData.Name || "",
                Relation: this._normalizeRelation(oData.Relation),
                Gender: oData.Gender || "",
                DateOfBirth: this._formatDateForDialog(oData.DateOfBirth),
                DocumentType: oData.DocumentType || "",
                DocumentName: oData.FileName || "",
                Document: oData.Attachment || "",
                File: oData.Attachment || "",
                FileType: oData.FileType || "",
                DocumentFile: null
            }), "Member");

            this._resetMemberDialogControls(oData);
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

            if (!sValue) {
                oComboBox.setSelectedKey("");
                oComboBox.setValue("");
                oComboBox.setValueState("None");
                return true;
            }

            return utils._LCstrictValidationComboBox(oComboBox, "ID");
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
            this._selectedFile = null;
        },

        onPreviewMemberDocument: function () {
            this._previewDocument(this.getView().getModel("Member").getData());
        },

        savepress: function () {
            var oCore = sap.ui.getCore();
            var oMember = this.getView().getModel("Member").getData();

            if (!(utils._LCstrictValidationComboBox(oCore.byId("idSelect"), "ID") &&
                    utils._LCvalidateMandatoryField(oCore.byId("MM_id_MemberName"), "ID") &&
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
            if (this._mode === "CREATE" && !oMember.Document) {
                MessageToast.show("Please upload a document");
                return;
            }

            this._uploadDocument({
                Members: [{
                    MemberID: oMember.MemberID,
                    Salutation: oMember.Salutation,
                    Name: oMember.Name,
                    Relation: oMember.Relation,
                    Gender: oMember.Gender,
                    UserID: oMember.UserID || this._getLoggedInUserId(),
                    DateOfBirth: oMember.DateOfBirth ? oMember.DateOfBirth.split("/").reverse().join("-") : "",
                    Documents: [{
                        DocumentID: this._mode === "UPDATE" && this._existingFileData ? this._existingFileData.DocumentID : "",
                        MemberID: oMember.MemberID,
                        UserID: oMember.UserID || this._getLoggedInUserId(),
                        DocumentType: oMember.DocumentType,
                        FileName: oMember.DocumentName,
                        FileType: oMember.FileType,
                        File: oMember.File
                    }]
                }]
            });
        },

        _uploadDocument: async function (oDoc) {
            var bCreate = this._mode === "CREATE";

            this.getBusyDialog();
            try {
                if (bCreate) {
                    await this.ajaxCreateWithJQuery("HM_MemberDocument", { data: [oDoc] });
                } else {
                    await this.ajaxUpdateWithJQuery("HM_MemberDocument", {
                        data: [oDoc],
                        filters: {
                            DocumentID: this._existingFileData && this._existingFileData.DocumentID || ""
                        }
                    });
                }

                if (this.UD_Dialog) {
                    this.UD_Dialog.close();
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

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("TilePage");
        },

        onLogPress: function () {
            this.CommonLogoutFunction();
        }
    });
});
