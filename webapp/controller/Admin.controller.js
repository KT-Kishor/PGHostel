sap.ui.define([
    "./BaseController",
    "../model/formatter",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "../utils/validation",
    "sap/m/MessageToast",
    "sap/ui/export/Spreadsheet",
], function (
    BaseController, Formatter, JSONModel, MessageBox, utils, MessageToast, Spreadsheet) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.Admin", {
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteAdmin").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function () {
            this.commonLoginFunction();
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            this._isClearPressed = false; // ensure full data is not requested'
            const currentYear = new Date().getFullYear();
            let fyStart, fyEnd;
            if (new Date().getMonth() >= 3) {
                fyStart = new Date(currentYear, 3, 1); // April 1
                fyEnd = new Date(currentYear + 1, 2, 31); // March 31 next year
            } else {
                fyStart = new Date(currentYear - 1, 3, 1); // April 1 last year
                fyEnd = new Date(currentYear, 2, 31); // March 31 this year
            }
            // Set the date range UI (override user-selected values)
            const dateRangeControl = this.byId("PO_id_Date");
            if (dateRangeControl) {
                dateRangeControl.setDateValue(fyStart);
                dateRangeControl.setSecondDateValue(fyEnd);
            }
            // this._loadHostelMasterData();
            await this.Cust_read(true)
            this.ajaxReadWithJQuery("HM_Rooms", "").then((oData) => {
                var oFCIAerData = Array.isArray(oData.commentData) ? oData.commentData : [oData.commentData];
                var model = new JSONModel(oFCIAerData);
                this.getView().setModel(model, "RoomDetailsModel");
            })

            var model = new JSONModel({
                BranchCode: "",
                BedType: "",
                Price: "",
                Description: "",

            });
            this.getView().setModel(model, "RoomModel")

            var model = new JSONModel({
                Visible: false
            });
            this.getView().setModel(model, "Visiblemodel")
            // this.BedTypedetails();
        },

        // _loadHostelMasterData: function () {
        //     this.ajaxReadWithJQuery("HM_Customer", {})
        //         .then((response) => {
        //             const oMasterModel = new sap.ui.model.json.JSONModel(response.Customers);
        //             this.getView().setModel(oMasterModel, "HostelMasterModel");

        //             // Keep original reference if needed
        //             this._originalRoomdata = response.Customers;
        //         });
        // },

        BedTypedetails: function () {
            this.ajaxReadWithJQuery("HM_BedType", "").then((oData) => {
                var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                var model = new JSONModel(oFCIAerData);
                this.getView().setModel(model, "BedTypeModel");
            })
        },

        Cust_read: function (flag) {
            try {
                sap.ui.core.BusyIndicator.show(0);

                const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();

                const sbookID = this.byId("PO_id_BookingId").getSelectedKey()
                    || this.byId("PO_id_BookingId").getValue();

                const sRoomNo = this.byId("PO_id_CompanyName").getSelectedKey()
                    || this.byId("PO_id_CompanyName").getValue();

                const sStatus = this.byId("PO_id_Status").getSelectedKey()
                    || this.byId("PO_id_Status").getValue();

                const oDateRange = this.byId("PO_id_Date");
                const oStartDate = oDateRange.getDateValue();
                const oEndDate = oDateRange.getSecondDateValue();

                const oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                    pattern: "yyyy-MM-dd"
                });

                // ================= Financial Year Logic =================
                const currentYear = new Date().getFullYear();
                let fyStart, fyEnd;

                if (new Date().getMonth() >= 3) { // April or later
                    fyStart = new Date(currentYear, 3, 1);      // Apr 1
                    fyEnd = new Date(currentYear + 1, 2, 31);   // Mar 31
                } else {
                    fyStart = new Date(currentYear - 1, 3, 1);  // Apr 1 last year
                    fyEnd = new Date(currentYear, 2, 31);       // Mar 31
                }

                // ================= Branch Logic =================
                const omainModel = this.getOwnerComponent().getModel("mainModel")?.getData() || [];
                let aBranchCodes = "";

                if (Array.isArray(omainModel) && omainModel.length) {
                    aBranchCodes = omainModel
                        .map(item => item.BranchID)
                        .flat()
                        .filter(Boolean)
                        .join(",");
                } else if (oExistingModel.BranchCode) {
                    aBranchCodes = oExistingModel.BranchCode;
                }

                let filters = {};
                if (oExistingModel.Role === "Admin" && aBranchCodes) {
                    filters.BranchCode = aBranchCodes;
                  }
                     if (oExistingModel.Role === "Admin"){
                          filters.Role ="Admin";
                        filters.BranchCode = aBranchCodes;

                     }

                if (sbookID) filters.BookingID = sbookID;
                if (sRoomNo) filters.RoomNo = sRoomNo;
                if (sStatus) filters.Status = sStatus;

                // ================= Date Handling (Same as Invoice) =================
                if (this._isClearPressed) {
                    // Clear → fetch all data
                    delete filters.StartDate;
                    delete filters.EndDate;
                    this._isClearPressed = false;

                } else if (oStartDate && oEndDate) {
                    // User selected date range
                    filters.StartDate = oDateFormat.format(oStartDate);
                    filters.EndDate = oDateFormat.format(oEndDate);

                } else {
                    // No date selected → default Financial Year
                    filters.StartDate = oDateFormat.format(fyStart);
                    filters.EndDate = oDateFormat.format(fyEnd);

                    // Set picker UI values
                    oDateRange.setDateValue(fyStart);
                    oDateRange.setSecondDateValue(fyEnd);
                }

                // ================= API Call =================
                this.ajaxReadWithJQuery("HM_Customer", filters).then((response) => {
                        if (!this._originalRoomdata || flag === true) {
                            this._originalRoomdata = response.Customers;
                        }

                        const oModel = new sap.ui.model.json.JSONModel(response.Customers);
                        this.getView().setModel(oModel, "HostelModel");

                        this._populateUniqueFilterValues(this._originalRoomdata);
                        sap.ui.core.BusyIndicator.hide();
                    }).catch(() => sap.ui.core.BusyIndicator.hide());
            } catch (e) {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        _populateUniqueFilterValues: function (data) {
            let uniqueValues = {
                PO_id_CompanyName: new Set(),
                PO_id_Status: new Set()
            };

            data.forEach(item => {
                if (item.RoomNo && item.RoomNo.trim()) {
                    uniqueValues.PO_id_CompanyName.add(item.RoomNo.trim());
                }
                if (item.Status) {
                    uniqueValues.PO_id_Status.add(item.Status.trim());
                }
            });

            let oView = this.getView();

            ["PO_id_CompanyName", "PO_id_Status"].forEach(field => {
                let oComboBox = oView.byId(field);
                if (!oComboBox) return;

                oComboBox.destroyItems();
                Array.from(uniqueValues[field]).sort().forEach(value => {
                    oComboBox.addItem(
                        new sap.ui.core.Item({
                            key: value,
                            text: value
                        })
                    );
                });
            });
        },

        //       HM_viewroom: function (oEvent) {

        //     var oContext = oEvent.getSource().getBindingContext("HostelModel");
        //     var oData = oContext.getObject();

        //     if (!oData.Documents || !oData.Documents.length) {
        //         sap.m.MessageBox.error("No document found for this room!");
        //         return;
        //     }

        //     var sBase64 = oData.Documents[0].File;

        //     if (!sBase64) {
        //         sap.m.MessageBox.error("No document found for this room!");
        //         return;
        //     }

        //     sBase64 = sBase64.replace(/\s/g, "");
        //     var decoded = "";

        //     try {
        //         decoded = atob(sBase64);
        //     } catch (e) {
        //         decoded = sBase64;
        //     }

        //     // Extract actual image base64 inside decoded
        //     var imagePart = decoded.includes("base64,")
        //         ? decoded.split("base64,")[1]
        //         : decoded;

        //     // Identify image type
        //     if (imagePart.startsWith("iVB")) {
        //         sBase64 = "data:image/png;base64," + imagePart;
        //     } else if (imagePart.startsWith("/9j")) {
        //         sBase64 = "data:image/jpeg;base64," + imagePart;
        //     } else {
        //         sBase64 = "data:image/jpeg;base64," + imagePart;
        //     }

        //     var oImage = new sap.m.Image({
        //         src: sBase64,
        //         width: "100%",
        //         height: "auto"
        //     });

        //     var oDialog = new sap.m.Dialog({
        //         title: "View Document",
        //         contentWidth: "400px",
        //         contentHeight: "500px",
        //         verticalScrolling: true,
        //         content: [oImage],
        //         endButton: new sap.m.Button({
        //             text: "Close",
        //             press: function () {
        //                 oDialog.close();
        //             }
        //         }),
        //         afterClose: function () {
        //             oDialog.destroy();
        //         }
        //     });

        //     oDialog.open();
        // },

    HM_AssignRoom: function (oEvent) {

    var table = this.byId("idPOTable");
    var selected = table.getSelectedItem();

    if (!selected) {
        sap.m.MessageToast.show(this.i18nModel.getText("pleaseSelectRecordtoAssignRoom"));
        return;
    }

    var Model = selected.getBindingContext("HostelModel");
    this.data = Model.getObject();

    if (
        this.data.Status === "Cancelled" ||
        this.data.Status === "Assigned" ||
        this.data.Status === "Completed"
    ) {
        sap.m.MessageToast.show(this.i18nModel.getText("thisCustomercantbeAssign"));
        return;
    }

    var oRoomDetailsModel = this.getView().getModel("RoomDetailsModel");
    var aRooms = oRoomDetailsModel.getData();

    var customerBranchCode = this.data.BranchCode;
    var customerBedType = this.data.BedType;

    // 🔹 SHOW ALL ROOMS (NO CAPACITY CHECK)
    var availableRoomNos = aRooms.filter(function (room) {

        if (room.BranchCode !== customerBranchCode) {
            return false;
        }

        if (room.BedTypeName !== customerBedType) {
            return false;
        }

        return true;

    }).map(function (room) {
        return {
            RoomNo: room.RoomNo
        };
    });

    var oAvailableRoomsModel = new sap.ui.model.json.JSONModel(availableRoomNos);
    this.getView().setModel(oAvailableRoomsModel, "AvailableRoomsModel");

    if (!this.HM_Dialog) {
        this.HM_Dialog = sap.ui.xmlfragment(
            "sap.ui.com.project1.fragment.Assign_Room",
            this
        );
        this.getView().addDependent(this.HM_Dialog);
    }

    this.getView().getModel("Visiblemodel").setProperty("/Visible", false);

    sap.ui.getCore().byId("idCustomerNameText")
        .setText(this.data.CustomerName + " (" + this.data.CustomerID + ")");

    sap.ui.getCore().byId("idRoomNumber1")
        .setSelectedKey("")
        .setValueState("None");

    this.HM_Dialog.open();
},



        HM_RoomDetails: function (oEvent) {
            var oView = this.getView();

            if (!this.ARD_Dialog) {
                this.ARD_Dialog = sap.ui.xmlfragment(oView.getId(), "sap.ui.com.project1.fragment.Bed_Type", this);
                oView.addDependent(this.ARD_Dialog);
            }
            // oView.byId("idRoomNumber").setVisible(false);
            // oView.byId("idActype").setVisible(false);

            this.ARD_Dialog.open();
        },

        // AR_onsavebuttonpress: function () {
        //     var oView = this.getView();
        //     var Payload = oView.getModel("BedModel").getData();
        //     var oFileUploader = this.byId("idFileUploader");
        //     var aFiles = oFileUploader.oFileUpload.files;

        //     // if (!aFiles.length) {
        //     //     sap.m.MessageBox.error("Please select a file to upload.");
        //     //     return;
        //     // }

        //     var oFile = aFiles[0];
        //     var reader = new FileReader();

        //     reader.onload = function (e) {
        //         var sBase64 = e.target.result.split(",")[1];
        //         Payload.File = sBase64;
        //         Payload.FileName = oFile.name;
        //         Payload.FileType = oFile.type;


        //         // Perform AJAX call only after file is fully read
        //         $.ajax({
        //             url: "https://rest.kalpavrikshatechnologies.com/HM_BedType",
        //             method: "POST",
        //             contentType: "application/json",
        //             headers: {
        //                 name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
        //                 password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
        //             },
        //             data: JSON.stringify({ data: Payload }),
        //             success: function (response) {
        //                 sap.m.MessageToast.show("Data and file uploaded successfully!");
        //                 if (this.FCIA_Dialog) {
        //                     this.FCIA_Dialog.close();
        //                 }
        //                 oFileUploader.setValue("");
        //                 this.ARD_Dialog.close();
        //             }.bind(this),
        //             error: function (err) {
        //                 sap.m.MessageBox.error("Error uploading data or file.");
        //             }
        //         });
        //     }.bind(this);

        //     reader.readAsDataURL(oFile);
        // },
        // RoomNo: function () {
        //       this.ajaxReadWithJQuery("HM_Booking", "").then((oData) => {
        //         var oFCIAerData = Array.isArray(oData.commentData) ? oData.commentData : [oData.commentData];
        //                 var model = new JSONModel(oFCIAerData);
        //         this.getView().setModel(model, "HostelModel");
        //     })

        // },

     ARNO_onsavebuttonpress: function () {

    var table = this.byId("idPOTable");
    var selected = table.getSelectedItem();

    if (!selected) {
        sap.m.MessageToast.show(this.i18nModel.getText("pleaseSelectRecordtoAssignRoom"));
        return;
    }

    var Model = selected.getBindingContext("HostelModel");
    var ID = Model.getObject();

    var selectedRoomNo =
        sap.ui.getCore().byId("idRoomNumber1").getSelectedKey() || ID.RoomNo;

    if (!selectedRoomNo) {
        sap.m.MessageToast.show("Please select a Room Number.");
        return;
    }

    var oRoomDetailsModel = this.getView().getModel("RoomDetailsModel");
    var aRooms = oRoomDetailsModel.getData();

    var oHostelModel = this.getView().getModel("HostelModel");
    var aCustomers = oHostelModel.getData();

    // 🔹 FIND ROOM
    var oRoom = aRooms.find(function (room) {
        return (
            room.RoomNo === selectedRoomNo &&
            room.BranchCode === ID.BranchCode &&
            room.BedTypeName === ID.BedType
        );
    });

    if (!oRoom) {
        sap.m.MessageToast.show("Room not found.");
        return;
    }

    // 🔹 COUNT ASSIGNED USERS
    var assignedCount = 0;
    aCustomers.forEach(function (customer) {
        if (
            customer.RoomNo === selectedRoomNo &&
            customer.BedType === ID.BedType &&
            customer.Status === "Assigned"
        ) {
            assignedCount++;
        }
    });

    // ❌ ROOM FULL → STOP
    if (assignedCount >= oRoom.NoofPerson) {
        sap.m.MessageToast.show(
            "Selected room is already filled. Please choose another room."
        );
        return;
    }

    // 🔹 SAVE
    var Payload = {
        RoomNo: selectedRoomNo,
        Status: "Assigned"
    };

    var oBody = {
        data: Payload,
        filters: {
            CustomerID: ID.CustomerID
        }
    };

    $.ajax({
        url: "https://rest.kalpavrikshatechnologies.com/HM_Booking",
        method: "PUT",
        contentType: "application/json",
        data: JSON.stringify(oBody),
        headers: {
            name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
            password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
        },
        success: async function () {
            sap.m.MessageToast.show(this.i18nModel.getText("recordUpdatedSuccessfully"));
            await this.Cust_read(true);
            this.HM_Dialog.close();
        }.bind(this),
        error: function (xhr) {
            sap.m.MessageToast.show("Error: " + xhr.statusText);
        }
    });
},


        onTableUpdateFinished: function () {
            this._updateRowCount();
        },

        _updateRowCount: function () {
            const oTable = this.byId("idPOTable");
            const oBinding = oTable.getBinding("items");
            const iLength = oBinding.getLength(); // filtered result count
            this.getView().getModel("HostelModel").setProperty("/count", iLength);
        },

        // HM_ChangeRoom: function() {
        //     var table = this.byId("idPOTable");
        //     var selected = table.getSelectedItem();
        //     if (!selected) {
        //         sap.m.MessageToast.show("Please select a record to checkout.");
        //         return;
        //     }

        //     var Model = selected.getBindingContext("HostelModel");
        //     var data = Model.getObject();
        //     this.RoomNo = data.RoomNo

        //     //      if(data.Bookings[0].Status==="New" || data.Bookings[0].Status==="Closed"){
        //     //      sap.m.MessageToast.show("The customer can not be edited");
        //     //        return;
        //     //    }

        //     var oRoomDetailsModel = this.getView().getModel("RoomDetailsModel");
        //     var aRooms = oRoomDetailsModel.getData(); // All room details

        //     // Get BedTypes from customer's bookings
        //     var customerBedTypes = [];
        //     if (data.Bookings && data.Bookings.length > 0) {
        //         data.Bookings.forEach(function(booking) {
        //             if (booking.BedType) {
        //                 customerBedTypes.push(booking.BedType);
        //             }
        //         });
        //     }

        //     if (customerBedTypes.length === 0) {
        //         sap.m.MessageToast.show("Customer does not have any BedType assigned.");
        //         return;
        //     }

        //     // Get all HostelModel data to check room occupancy
        //     var oHostelModel = this.getView().getModel("HostelModel");
        //     var aCustomers = oHostelModel.getData(); // All customer bookings

        //     // Filter room numbers that match customer's BedType AND are not fully booked
        //     var availableRoomNos = aRooms.filter(function(room) {
        //         if (!customerBedTypes.includes(room.BedTypeName)) {
        //             return false; // Room's bed type doesn't match customer's
        //         }

        //         // Count how many customers already have this RoomNo and BedType
        //         var count = 0;
        //         aCustomers.forEach(function(customer) {
        //             if (customer.Bookings && customer.Bookings.length > 0) {
        //                 customer.Bookings.forEach(function(booking) {
        //                     if (booking.RoomNo === room.RoomNo && booking.BedType === room.BedTypeName && booking.Status !== "Closed") {
        //                         count++;
        //                     }
        //                 });
        //             }
        //         });

        //         // Only include room if it is not fully booked
        //         return count < room.NoofPerson; // Assuming room.Capacity exists in RoomDetailsModel
        //     }).map(function(room) {
        //         return {
        //             RoomNo: room.RoomNo
        //         }; // Only include RoomNo
        //     });

        //     // Set AvailableRoomsModel
        //     var oAvailableRoomsModel = new sap.ui.model.json.JSONModel(availableRoomNos);
        //     this.getView().setModel(oAvailableRoomsModel, "AvailableRoomsModel");

        //     if (!this.HM_Dialog) {
        //         var oView = this.getView();
        //         this.HM_Dialog = sap.ui.xmlfragment("sap.ui.com.project1.fragment.Assign_Room", this);
        //         oView.addDependent(this.HM_Dialog);
        //     }
        //     sap.ui.getCore().byId("idCustomerNameText").setText(data.CustomerName + " (" + data.CustomerID + ")");
        //     sap.ui.getCore().byId("idRoomNumber1").setValue(data.Bookings[0].RoomNo).setValueState("None");
        //     sap.ui.getCore().byId("id_BranchCode").setValue(data.BranchCode).setValueState("None");

        //     sap.ui.getCore().byId("idBedType").setValue(data.Bookings[0].BedType).setValueState("None");

        //     sap.ui.getCore().byId("AR_id_StartDate").setDateValue(new Date(data.Bookings[0].StartDate)).setValueState("None");
        //     sap.ui.getCore().byId("AR_id_EndDate").setDateValue(new Date(data.Bookings[0].EndDate)).setValueState("None");


        //     // sap.ui.getCore().byId("id_facility").setValue(data.Bookings[0].RoomNo).setValueState("None");
        //     this.getView().getModel("Visiblemodel").setProperty("/Visible", true)


        //     this.getView().getModel("")
        //     this.HM_Dialog.open();
        // },

        AR_onCancelButtonPress: function () {
            this.ARD_Dialog.close();
        },

        HM_onCancelButtonPress: function () {
            var table = this.byId("idPOTable");
            table.removeSelections();
            this.HM_Dialog.close();

        },

        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
            this.getView().getModel("HostelModel").setData({});

        },

        HM_id_saveButton: function (oEvent) {
            var oModel = this.getView().getModel("HostelModel");
            var oData = oModel.getData();

            var sId = oData.ID;

            $.ajax({
                url: "https://rest.kalpavrikshatechnologies.com/HM_Customer/" + sId,
                method: "PUT",
                contentType: "application/json",
                data: JSON.stringify(oData),
                headers: {
                    name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                    password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
                },
                success: function (response) {
                    sap.m.MessageToast.show(this.i18nModel.getText("recordUpdatedSuccessfully"));
                },
                error: function (xhr) {
                    sap.m.MessageToast.show("Error: " + xhr.statusText);
                }
            });
        },

        HM_onSearch: function (oEvent) {
            var oView = this.getView();
            var oTable = oView.byId("idPOTable");
            var oBinding = oTable.getBinding("items");

            var sCustomerName = oView.byId("PO_id_CustomerName").getSelectedKey() || oView.byId("PO_id_CustomerName").getValue();
            var sBookingId = oView.byId("PO_id_BookingId").getSelectedKey() || oView.byId("PO_id_BookingId").getValue();

            var sRoomNo = oView.byId("PO_id_CompanyName").getSelectedKey() || oView.byId("PO_id_CompanyName").getValue();
            var status = oView.byId("PO_id_Status").getSelectedKey() || oView.byId("PO_id_Status").getValue();

            var aFilters = [];

            if (sCustomerName) {
                aFilters.push(new sap.ui.model.Filter("CustomerID", sap.ui.model.FilterOperator.EQ, sCustomerName));
            }
            if (sRoomNo) {
                aFilters.push(new sap.ui.model.Filter("RoomNo", sap.ui.model.FilterOperator.EQ, sRoomNo));
            }
            if (status) {
                aFilters.push(new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.EQ, status));
            }
            if (sBookingId) {
                aFilters.push(new sap.ui.model.Filter("BookingID", sap.ui.model.FilterOperator.EQ, sBookingId));
            }

            var oCombinedFilter = new sap.ui.model.Filter({
                filters: aFilters,
                and: true
            });

            oBinding.filter(oCombinedFilter);
            this._updateRowCount();
        },

        onHome: function () {
            this.CommonLogoutFunction();
            this.getView().getModel("HostelModel").setData({});
        },

        PO_onPressClear: function () {
            this._isClearPressed = true;
            this.getView().byId("PO_id_CompanyName").setSelectedKey("")
            this.getView().byId("PO_id_Status").setSelectedKey("")
            this.getView().byId("PO_id_BookingId").setSelectedKey("")
            this.byId("PO_id_Date").setValue("");
        },

        onRoomNoChange: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
        },

        AD_onPressEditDetails: function (oEvent) {
            this.getOwnerComponent().getRouter().navTo("RouteAdminDetails", {
                sPath: encodeURIComponent(oEvent.getSource().getBindingContext("HostelModel").getObject().CustomerID)
            });
        },

        createTableSheet: function () {
            return [{
                label: "Customer ID",
                property: "CustomerID",
                type: "string"
            },
            {
                label: "Customer Name",
                property: "CustomerName",
                type: "string"
            },
            {
                label: "Booking ID",
                property: "BookingID",
                type: "string"
            },
            {
                label: "Booking Date",
                property: "BookingDate",
                type: "string"
            },
            {
                label: "Gender",
                property: "Gender",
                type: "string"
            },
            {
                label: "STD Code",
                property: "STDCode",
                type: "string"
            },
            {
                label: "Contact Information",
                property: "MobileNo",
                type: "string"
            },
            {
                label: "Email ID ",
                property: "CustomerEmail",
                type: "string"
            },
            {
                label: "Start Date",
                property: "StartDate",
                type: "string"
            },
            {
                label: "End Date",
                property: "EndDate",
                type: "string"
            },
            {
                label: "Room Number",
                property: "RoomNo",
                type: "string"
            },
            {
                label: "Bed Type",
                property: "BedType",
                type: "string"
            },
            {
                label: "Status",
                property: "Status",
                type: "string"
            }
            ]
        },

        MD_onDownload: function () {
            const oModel = this.byId("idPOTable").getModel("HostelModel").getData();
            if (!oModel || oModel.length === 0) {
                MessageToast.show(this.i18nModel.getText("MSnodata"));
                return;
            }
            const adjustedData = oModel.map(item => ({
                ...item,
                BookingDate: Formatter.formatDate(item.BookingDate),
                StartDate: Formatter.formatDate(item.StartDate),
                EndDate: Formatter.formatDate(item.EndDate)
                // Pincode: item.Pincode ? String(item.Pincode) : "",
                // Contact: item.Contact ? String(item.Contact) : ""
            }));
            const aCols = this.createTableSheet();
            const oSettings = {
                workbook: {
                    columns: aCols,
                    hierarchyLevel: "Level"
                },
                dataSource: adjustedData,
                fileName: "Admin_Details.xlsx",
                worker: false
            };
            MessageToast.show(this.i18nModel.getText("downloadingAdminDetails"));
            const oSheet = new sap.ui.export.Spreadsheet(oSettings);

            oSheet.build().then(() => {
                MessageToast.show(this.i18nModel.getText("MSdownloadedsuccess"));
            }).finally(() => {
                oSheet.destroy();
            });
        }
    });
});