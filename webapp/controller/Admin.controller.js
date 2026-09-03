sap.ui.define([
    "./BaseController",
    "../model/formatter",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "../utils/validation",
    "sap/m/MessageToast",
    "sap/ui/export/Spreadsheet"
], function (
    BaseController, Formatter, JSONModel, MessageBox, utils, MessageToast, Spreadsheet) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.Admin", {
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteAdmin").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function (oEvent) {
            this.getBusyDialog();
            this.getView().setModel(new JSONModel([]), "HostelModel");

            var LoginFUnction = await this.commonLoginFunction("ManageCustomer");
            if (!LoginFUnction) return;
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
            var sPath = oEvent.getParameter("arguments").sPath;
            this.sPath = oEvent.getParameter("arguments").sPath;

            if (sPath === "TilePage") {
                this.getView().byId("PO_id_CompanyName").setSelectedKey("")
                this.getView().byId("PO_id_Status").setSelectedKey("")
                this.getView().byId("PO_id_BookingId").setSelectedKey("")
                this.getView().byId("PO_id_CustomerName").setSelectedKey("")
                this.getView().byId("PO_id_PropertyName").setSelectedKey("")

            }


            await this._loadBranchCode()
            await this.Cust_read(true, true);
            this.ajaxReadWithJQuery("HM_Rooms", "").then((oData) => {
                var oFCIAerData = Array.isArray(oData.commentData) ? oData.commentData : [oData.commentData];
                var model = new JSONModel(oFCIAerData);
                this.getOwnerComponent().setModel(model, "RoomDetailsModel");
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
            this.BedTypedetails();
        },

        getGroupHeader: function (oGroup) {
            return this.getStyledGroupHeader(oGroup);
        },

        _loadBranchCode: async function () {
            const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();
            const omainModel = this.getOwnerComponent().getModel("mainModel")?.getData() || [];

            let aBranchCodes = "";

            if (Array.isArray(omainModel) && omainModel.length) {
                aBranchCodes = omainModel.map(item => item.BranchID).flat().filter(Boolean).join(",");
            } else if (oExistingModel.BranchCode) {
                aBranchCodes = oExistingModel.BranchCode;
            }

            let filters = {};

            if (oExistingModel.Role === "Admin" && aBranchCodes) {
                filters.BranchID = aBranchCodes;
            } else if (oExistingModel.Role === "SuperAdmin") {
                filters.BranchID = "";
            } else {
                filters.BranchID = oExistingModel.BranchCode;
            }
            try {
                const oResponse = await this.ajaxReadWithJQuery("HM_BranchData", filters);
                const aBranches = Array.isArray(oResponse?.data) ? oResponse.data : (oResponse?.data ? [oResponse.data] : []);
                const oBranchModel = new sap.ui.model.json.JSONModel(aBranches);
                this.getView().setModel(oBranchModel, "BranchModel");
            } catch (err) {
                this.closeBusyDialog()
                sap.m.MessageToast.show(err.message || err.responseText);
            }
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
        onDepositTypeSelect: function (oEvent) {
            const oButtonGroup = oEvent.getSource();
            this.selectedIndex = oButtonGroup.getSelectedIndex();



            if (this.selectedIndex === 0) {
                sap.ui.getCore().byId("id_ActualAmount").setEnabled(true);
                sap.ui.getCore().byId("idPaymentMode").setEnabled(true);

                sap.ui.getCore().byId("id_TransactionID").setEnabled(true);
                sap.ui.getCore().byId("id_DepositTypeLabel").setRequired(true);

                sap.ui.getCore().byId("id_PaymentModeLabel").setRequired(true);

                sap.ui.getCore().byId("id_TransactionIDLabel").setRequired(true);


            } else if (this.selectedIndex === 1) {
                sap.ui.getCore().byId("id_ActualAmount").setEnabled(false).setValue("");
                sap.ui.getCore().byId("idPaymentMode").setEnabled(false).setValue("");

                sap.ui.getCore().byId("id_TransactionID").setEnabled(false).setValue("");

                sap.ui.getCore().byId("id_DepositTypeLabel").setRequired(false);
                sap.ui.getCore().byId("id_PaymentModeLabel").setRequired(false);

                sap.ui.getCore().byId("id_TransactionIDLabel").setRequired(false);


            }
        },

        Cust_read: function (flag, bBusyAlreadyOpen) {
            try {
                if (!bBusyAlreadyOpen) {
                    this.getBusyDialog();
                }

                const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();

                const sbookID = this.byId("PO_id_BookingId").getSelectedKey()
                    || this.byId("PO_id_BookingId").getValue();

                const sRoomNo = this.byId("PO_id_CompanyName").getSelectedKey()
                    || this.byId("PO_id_CompanyName").getValue();

                const sStatus = this.byId("PO_id_Status").getSelectedKey()
                    || this.byId("PO_id_Status").getValue();

                const sCustomerName = this.byId("PO_id_CustomerName").getSelectedKey()
                    || this.byId("PO_id_CustomerName").getValue();


                const sBranchName = this.byId("PO_id_PropertyName").getSelectedKey()

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
                if (oExistingModel.Role === "Admin") {
                    filters.Role = "Admin";
                    filters.BranchCode = aBranchCodes;
                } else if (oExistingModel.Role === "SuperAdmin") {
                    filters.BranchCode = "";
                } else {
                    filters.BranchCode = oExistingModel.BranchCode;
                }

                if (sbookID) filters.BookingID = sbookID;
                if (sRoomNo) filters.RoomNo = sRoomNo;
                if (sStatus) filters.Status = sStatus;
                if (sCustomerName) filters.CustomerName = sCustomerName;
                if (sBranchName) filters.BranchCode = sBranchName;


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

                    const customerData = Array.isArray(response.Customers) ? response.Customers : [response.Customers];

                    const branchData = this.getView().getModel("BranchModel")?.getData() || [];

                    // Map BranchCode → BranchName
                    const mappedData = customerData.map(customer => {
                        const branch = branchData.find(br => br.BranchID === customer.BranchCode);
                        return {
                            ...customer,
                            BranchName: branch ? branch.Name : customer.BranchCode // fallback
                        };
                    });
                    if ((!this._originalRoomdata || flag === true) && this.sPath === "TilePage") {
                        this._originalRoomdata = mappedData;
                    }



                    if (!this.getView().getModel("BranchFilterModel")) {

                        const uniqueBranches = [
                            ...new Map(
                                mappedData.map(item => [
                                    item.BranchCode,
                                    {
                                        BranchCode: item.BranchCode,
                                        BranchName: item.BranchName
                                    }
                                ])
                            ).values()
                        ];

                        const oBranchModel = new sap.ui.model.json.JSONModel(uniqueBranches);
                        this.getView().setModel(oBranchModel, "BranchFilterModel");
                    }

                    const oModel = new sap.ui.model.json.JSONModel(mappedData);
                    this.getView().setModel(oModel, "HostelModel");
                    this.getOwnerComponent().setModel(oModel, "HostelModelcheckrooms");



                    this._populateUniqueFilterValues(this._originalRoomdata);
                    this._addNoDataToComboBoxes();
                    this.closeBusyDialog()
                }).catch(() => this.closeBusyDialog());
            } catch (e) {
                this.closeBusyDialog()
            }
        },

        _addNoDataToComboBoxes: function () {
            const comboBoxes = [
                "PO_id_BookingId",
                "PO_id_CompanyName",    // RoomNo filter
                "PO_id_Status",         // Status filter  
                "PO_id_CustomerName"    // CustomerName filter
            ];

            comboBoxes.forEach(sId => {
                const oComboBox = this.byId(sId);
                if (oComboBox && oComboBox.getItems().length === 0) {
                    oComboBox.insertItem(new sap.ui.core.ListItem({
                        key: "",
                        text: "No Data",
                        textAlign: "Center"
                    }), 0);
                }
            });
        },


        _populateUniqueFilterValues: function (data) {
            let uniqueValues = {
                PO_id_BookingId: new Set(),
                PO_id_CompanyName: new Set(),
                PO_id_CustomerName: new Set()

            };

            data.forEach(item => {
                if (item.BookingID && item.BookingID.trim()) {
                    uniqueValues.PO_id_BookingId.add(item.BookingID.trim());
                }
                if (item.RoomNo && item.RoomNo.trim()) {
                    uniqueValues.PO_id_CompanyName.add(item.RoomNo.trim());
                }

                if (item.CustomerName) {
                    uniqueValues.PO_id_CustomerName.add(item.CustomerName.trim());
                }

            });

            let oView = this.getView();

            ["PO_id_BookingId", "PO_id_CompanyName", "PO_id_CustomerName"].forEach(field => {
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
            this.selectedIndex = 0


            var Beddata = this.getView().getModel("BedTypeModel").getData()

            var Hostelmodel = this.getView().getModel("HostelModel").getData()

            var table = this.byId("idPOTable");
            var selected = table.getSelectedItem();

            if (!selected) {

                sap.m.MessageBox.show(
                    this.i18nModel.getText("pleaseSelectRecordtoAssignRoom"),
                    {
                        icon: sap.m.MessageBox.Icon.Information,
                        title: this.i18nModel.getText("Information"),
                        actions: [sap.m.MessageBox.Action.OK],
                        onClose: function (oAction) {
                            if (oAction === sap.m.MessageBox.Action.OK) {
                                this.byId("idPOTable").removeSelections(true);
                            }
                        }.bind(this)
                    }
                );
            }

            var Model = selected.getBindingContext("HostelModel");
            this.data = Model.getObject();

            var BranchData = this.getView().getModel("BranchModel").getData().find((item) => {
                return item.BranchID === this.data.BranchCode
            })

            const bedName = this.data.BedType.replace(/\s*-\s*(AC|NON-AC)$/i, "").trim();
            const acType = this.data.BedType.includes("NON-AC") ? "NON-AC" : "AC";

            var Deposit = Beddata.find((item) => {
                return item.Name === bedName && item.ACType === acType && item.BranchCode === this.data.BranchCode

            })

            if (
                this.data.Status === "Cancelled" ||
                this.data.Status === "Completed" ||
                this.data.Status === "Rejected" ||
                this.data.Status === "New"
            ) {
                sap.m.MessageBox.show(
                    this.i18nModel.getText("thisCustomercantbeAssign"),
                    {
                        icon: sap.m.MessageBox.Icon.Information,
                        title: this.i18nModel.getText("Information"),
                        actions: [sap.m.MessageBox.Action.OK],
                        onClose: function (oAction) {
                            if (oAction === sap.m.MessageBox.Action.OK) {
                                this.byId("idPOTable").removeSelections(true);
                            }
                        }.bind(this)
                    }
                );
                return;
            }

            var oStartDate = new Date(this.data.StartDate);
            var oToday = new Date();

            // normalize time (important!)
            oStartDate.setHours(0, 0, 0, 0);
            oToday.setHours(0, 0, 0, 0);

            if (oStartDate.getTime() > oToday.getTime() && this.data.Status === "Confirmed") {
                sap.m.MessageBox.show(
                    this.i18nModel.getText("Room cannot be assigned for a future date"),
                    {
                        icon: sap.m.MessageBox.Icon.Information,
                        title: this.i18nModel.getText("Information"),
                        actions: [sap.m.MessageBox.Action.OK],
                        onClose: function (oAction) {
                            if (oAction === sap.m.MessageBox.Action.OK) {
                                this.byId("idPOTable").removeSelections(true);
                            }
                        }.bind(this)
                    }
                );
                return;
            }


            var oRoomDetailsModel = this.getView().getModel("RoomDetailsModel");
            var aRooms = oRoomDetailsModel.getData();

            var customerBranchCode = this.data.BranchCode;
            var customerBedType = this.data.BedType;

            var oHostelModel = this.getView().getModel("HostelModel");
            var aCustomers = oHostelModel.getData();
            // 🔹 SHOW ALL ROOMS (NO CAPACITY CHECK)
            var availableRoomNos = aRooms.filter(function (room) {

                // Branch match
                if (room.BranchCode !== customerBranchCode) {
                    return false;
                }

                // Bed type match
                if (room.BedTypeName !== customerBedType) {
                    return false;
                }

                // Count already assigned customers in this room
                var assignedCount = aCustomers.filter(function (customer) {
                    return (
                        customer.RoomNo === room.RoomNo &&
                        customer.BedType === room.BedTypeName &&
                        customer.Status === "Assigned"
                    );
                }).length;

                // Room is available only if capacity is not reached
                if (assignedCount >= Number(room.NoofPerson)) {
                    return false;
                }

                return true;

            }).map(function (room) {
                return {
                    RoomNo: room.RoomNo
                };
            });

            if (BranchData.PropertyType === "Rented Properties" || BranchData.PropertyType === "Hotel" || BranchData.PropertyType === "Service Apartments") {
                let hostelData = this.getView().getModel("HostelModel").getData().filter(item => item.BranchCode === customerBranchCode);

                availableRoomNos = availableRoomNos.filter(roomNo => {
                    return (
                        roomNo.RoomNo === this.data.RoomNo ||
                        !hostelData.some(item =>
                            item.RoomNo === roomNo.RoomNo &&
                            item.Status === "Assigned"
                        )
                    );
                });

            }

            var oAvailableRoomsModel = new sap.ui.model.json.JSONModel(availableRoomNos);
            this.getView().setModel(oAvailableRoomsModel, "AvailableRoomsModel");

            if (!this.HM_Dialog) {
                this.HM_Dialog = sap.ui.xmlfragment(
                    "sap.ui.com.project1.fragment.Assign_Room",
                    this
                );
                this.getView().addDependent(this.HM_Dialog);
            }

            var aControls = this.HM_Dialog.findAggregatedObjects(true, function (oControl) {
                return oControl instanceof sap.m.Input ||
                    oControl instanceof sap.m.ComboBox ||
                    oControl instanceof sap.m.Select ||
                    oControl instanceof sap.m.TextArea;
            });

            aControls.forEach(function (oControl) {
                oControl.setValueState("None");
            });

            sap.ui.getCore().byId("idCustomerNameText")
                .setText(this.data.CustomerName + " (" + this.data.BookingID + ")");

            sap.ui.getCore().byId("id_DepositTypeLabel").setRequired(true);

            sap.ui.getCore().byId("id_PaymentModeLabel").setRequired(true);

            sap.ui.getCore().byId("id_TransactionIDLabel").setRequired(true);

            sap.ui.getCore().byId("idPaymentMode").setSelectedKey("").setEnabled(true);
            sap.ui.getCore().byId("roomTypeGroup1").setSelectedIndex(0);

            sap.ui.getCore().byId("id_TransactionID").setValue("").setEnabled(true);

            sap.ui.getCore().byId("idRoomNumber1").setSelectedKey("");
            sap.ui.getCore().byId("id_ActualAmount").setValue("").setEnabled(true);


            var depositRequired = Deposit ? Number(Deposit.Deposit) : 0;

            // Show the deposit section only when a deposit is actually required
            // (booking not yet assigned AND required deposit greater than zero).
            var bShowDeposit = this.data.Status !== "Assigned" && depositRequired > 0;
            this._bDepositRequired = bShowDeposit;

            if (this.data.Status === "Assigned") {
                sap.ui.getCore().byId("idRoomNumber1")
                    .setSelectedKey(this.data.RoomNo)
                    .setValueState("None");

            } else {
                sap.ui.getCore().byId("idRoomNumber1")
                    .setSelectedKey("")
                    .setValueState("None");

            }
            this.getView().getModel("Visiblemodel").setProperty("/Visible", bShowDeposit);
            sap.ui.getCore().byId("id_DepositAmount").setValue(depositRequired);
            this.Deposit = depositRequired

            this.HM_Dialog.open();
        },
        HM_UnassignRoom: function () {
            var table = this.byId("idPOTable");
            var selected = table.getSelectedItem();

            if (!selected) {
                sap.m.MessageToast.show("Please select a record to unassign.");
                return;
            }

            var oContext = selected.getBindingContext("HostelModel");
            var data = oContext.getObject();

            if (data.Status !== "Assigned") {
                sap.m.MessageToast.show("Only assigned rooms can be unassigned.");
                return;
            }

            sap.m.MessageBox.confirm(
                "Are you sure you want to unassign this room?",
                {
                    title: "Confirm Unassign",
                    actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                    emphasizedAction: sap.m.MessageBox.Action.YES,
                    styleClass: "myUnifiedBtn",
                    onClose: function (oAction) {
                        if (oAction === sap.m.MessageBox.Action.YES) {

                            var Payload = {
                                RoomNo: "",
                                Status: "New"
                            };

                            var oBody = {
                                data: Payload,
                                filters: {
                                    BookingID: data.BookingID
                                }
                            };

                            this.ajaxUpdateWithJQuery("HM_Booking", oBody)
                                .then(() => {
                                    this.Cust_read(true);
                                    sap.m.MessageToast.show("Room unassigned successfully.");
                                })
                                .catch((oError) => {
                                    sap.m.MessageToast.show(
                                        "Error: " + (oError.responseText || oError.statusText)
                                    );
                                });
                        }
                    }.bind(this)
                }
            );
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
        //             url: "https://rest.kalpavrikshatechnologies.com/stayvriksha/HM_BedType",
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

        ARNO_onsavebuttonpress: async function () {
            var oView = sap.ui.getCore();
            const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();

            var table = this.byId("idPOTable");
            var selected = table.getSelectedItem();

            if (!selected) {
                sap.m.MessageToast.show(
                    this.i18nModel.getText("pleaseSelectRecordtoAssignRoom")
                );
                return;
            }

            var oContext = selected.getBindingContext("HostelModel");
            var ID = oContext.getObject();

            var selectedRoomNo =
                sap.ui.getCore().byId("idRoomNumber1").getSelectedKey() || ID.RoomNo;

            var DepositAmount =
                sap.ui.getCore().byId("id_ActualAmount").getValue();

            var PaymentMode =
                sap.ui.getCore().byId("idPaymentMode").getSelectedKey();

            var TransactionID =
                sap.ui.getCore().byId("id_TransactionID").getValue();

            /* ================= VALIDATIONS ================= */

            if (this._bDepositRequired && ID.Status === "Confirmed" && this.selectedIndex === 0) {
                if (
                    !utils._LCvalidateMandatoryField(oView.byId("id_ActualAmount"), "ID") ||
                    !utils._LCstrictValidationComboBox(oView.byId("idPaymentMode"), "ID") ||
                    (!utils._LCvalidateMandatoryField(oView.byId("id_TransactionID"), "ID")) ||
                    !utils._LCstrictValidationComboBox(oView.byId("idRoomNumber1"), "ID")
                ) {
                    sap.m.MessageToast.show(
                        this.i18nModel.getText(
                            "pleaseFillallRequiredFieldsCorrectlybeforeSaving"
                        )
                    );
                    return;
                }
            }

            // When no deposit is required, the deposit fields are hidden; only the room must be validated.
            if (!this._bDepositRequired && ID.Status === "Confirmed") {
                if (
                    !utils._LCstrictValidationComboBox(oView.byId("idRoomNumber1"), "ID")
                ) {
                    sap.m.MessageToast.show(
                        this.i18nModel.getText(
                            "pleaseFillallRequiredFieldsCorrectlybeforeSaving"
                        )
                    );
                    return;
                }
            }

            if ((ID.Status === "Assigned" || ID.Status === "Confirmed") && this.selectedIndex === 1) {
                if (
                    !utils._LCstrictValidationComboBox(oView.byId("idRoomNumber1"), "ID")
                ) {
                    sap.m.MessageToast.show(
                        this.i18nModel.getText(
                            "pleaseFillallRequiredFieldsCorrectlybeforeSaving"
                        )
                    );
                    return;
                }
            }

            /* ================= ROOM VALIDATION ================= */

            var oRoomDetailsModel = this.getView().getModel("RoomDetailsModel");
            var aRooms = oRoomDetailsModel.getData();

            var oHostelModel = this.getView().getModel("HostelModel");
            var aCustomers = oHostelModel.getData();

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

            var isSameRoom = ID.RoomNo === selectedRoomNo;
            if (!isSameRoom && assignedCount >= oRoom.NoofPerson) {
                sap.m.MessageToast.show(
                    "Selected room is already filled. Please choose another room."
                );
                return;
            }

            /* ================= PAYLOAD ================= */

            if (this._bDepositRequired && Number(DepositAmount) > Number(this.Deposit)) {
                sap.m.MessageToast.show("Deposit amount cannot be more than the required deposit of " + this.Deposit);
                return;
            }
            if (this._bDepositRequired && Number(DepositAmount) === 0 && this.selectedIndex === 0) {
                sap.m.MessageToast.show("Deposit amount cannot be set to zero");
                return;
            }

            let Payload, oBody;

            if (ID.Status === "Assigned") {
                Payload = {
                    CustomerEmail: ID.CustomerEmail,
                    RoomNo: selectedRoomNo,
                    CustomerName: ID.CustomerName,
                    MemberID: ID.MemberID,
                    Status: "Assigned"
                };

                oBody = {
                    data: Payload,
                    filters: {
                        BookingID: ID.BookingID,
                        flag: "True"
                    }
                };
            } else if (DepositAmount) {
                Payload = {
                    CustomerEmail: ID.CustomerEmail,
                    UserID: ID.UserID,
                    MemberID: ID.MemberID,
                    CustomerName: ID.CustomerName,
                    DepositAmount: parseInt(DepositAmount),
                    DepositCurrency: "INR",
                    DepositMode: PaymentMode,
                    DepositTransactionID: PaymentMode === "Cash" ? "" : TransactionID,
                    DepositDate: new Date().toISOString().split("T")[0],
                    BranchCode: ID.BranchCode,
                    DepositTakenBy: oExistingModel.EmployeeName,
                    RoomNo: selectedRoomNo,
                    BranchName: ID.BranchName,
                    STDCode: oExistingModel.STDCode,
                    MobileNo: oExistingModel.MobileNo,
                    AdminEmail: oExistingModel.EmailID,
                    Status: "Assigned"
                };

                oBody = {
                    data: Payload,
                    filters: {
                        BookingID: ID.BookingID,
                        flag: "False"
                    }
                };
            } else {
                Payload = {
                    CustomerEmail: ID.CustomerEmail,
                    RoomNo: selectedRoomNo,
                    CustomerName: ID.CustomerName,
                    UserID: ID.UserID,
                    MemberID: ID.MemberID,
                    BranchName: ID.BranchName,
                    STDCode: oExistingModel.STDCode,
                    MobileNo: oExistingModel.MobileNo,
                    AdminEmail: oExistingModel.EmailID,
                    Status: "Assigned"
                };

                oBody = {
                    data: Payload,
                    filters: {
                        BookingID: ID.BookingID,
                        flag: "True"
                    }
                };
            }

            /* ================= API CALL ================= */

            try {
                this.getBusyDialog()
                await this.ajaxUpdateWithJQuery("HM_BookingDeposit", oBody);
                await this.Cust_read(true);
                this.HM_Dialog.close();

                this.getOwnerComponent().setModel(
                    new sap.ui.model.json.JSONModel({
                        BookingID: ID.BookingID,
                        Status: "Assigned",
                        CustomerName: ID.CustomerName
                    }),
                    "InvoiceNavContext"
                );

                if (ID.Status === "Confirmed") {


                    sap.m.MessageBox.confirm(
                        "Are you sure you want to proceed to the invoice?",
                        {
                            title: "Confirm Navigation",
                            icon: sap.m.MessageBox.Icon.INFORMATION,
                            actions: [
                                sap.m.MessageBox.Action.OK,
                                sap.m.MessageBox.Action.CANCEL,
                            ],

                            styleClass: "myUnifiedBtn",
                            onClose: (sAction) => {
                                if (sAction === sap.m.MessageBox.Action.OK) {
                                    this.getOwnerComponent()
                                        .getRouter()
                                        .navTo("RouteManageInvoiceDetails", {
                                            sPath: "X",
                                            dash: "AdminPage"
                                        });
                                } else {
                                    sap.m.MessageToast.show(
                                        this.i18nModel.getText("recordUpdatedSuccessfully")
                                    );
                                    this.getOwnerComponent().getModel("InvoiceNavContext").setData({});
                                }
                            }
                        }
                    );
                }

            } catch (oError) {

                let sErrorMsg = "Update failed";

                if (oError.responseJSON && oError.responseJSON.message) {
                    sErrorMsg = oError.responseJSON.message;
                } else if (oError.responseText) {
                    sErrorMsg = oError.responseText;
                } else if (oError.statusText) {
                    sErrorMsg = oError.statusText;
                }
                this.closeBusyDialog()

                // sap.m.MessageBox.error(sErrorMsg);
                sap.m.MessageBox.error(sErrorMsg, {
                    title: "Error",
                    actions: [sap.m.MessageBox.Action.OK],
                    emphasizedAction: sap.m.MessageBox.Action.OK,
                    styleClass: "myUnifiedBtn",

                    onClose: function (sAction) {

                        if (sAction === sap.m.MessageBox.Action.OK) {

                            // var sCustomerID = ID.CustomerID;
                            // var sEncodedID = btoa(sCustomerID.toString());

                            // this.getOwnerComponent().getRouter().navTo("RouteAdminDetails", {
                            //     sPath: encodeURIComponent(sEncodedID),
                            //     from: "Customerdetails"
                            // });
                            this.HM_Dialog.close();
                            this.byId("idPOTable").removeSelections();
                        }

                        // If Cancel → Do nothing
                    }.bind(this)
                });

            }

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
            this.selectedIndex = 0;
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
                url: "https://rest.kalpavrikshatechnologies.com/stayvriksha/HM_Customer/" + sId,
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
            this.getView().byId("PO_id_CustomerName").setSelectedKey("")
            this.getView().byId("PO_id_PropertyName").setSelectedKey("")

            this.byId("PO_id_Date").setValue("");
        },
        onPaymentModeChange: function (oEvent) {
            var oComboBox = oEvent.getSource();
            utils._LCstrictValidationComboBox(oComboBox, "ID");

            var sPaymentMode = oComboBox.getSelectedKey();

            if (sPaymentMode === "Cash") {
                var oLoginData = this.getOwnerComponent().getModel("LoginModel").getData();

                this.getView().getModel("HostelModel").setProperty(
                    "/TransactionID",
                    oLoginData.EmployeeName
                );
                sap.ui.getCore().byId("id_TransactionID").setEditable(false)
            } else {
                this.getView().getModel("HostelModel").setProperty("/TransactionID", "");
                sap.ui.getCore().byId("id_TransactionID").setEditable(true)

            }
        },
        onRoomNoChange: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
        },
           onbranchChange: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
        },
          onmonthChange: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
        },
        DepositAmountLiveChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent.getSource(), "ID");
        },
        ActualAmountLiveChange: function (oEvent) {
            utils.onNumber(oEvent.getSource(), "ID");
        },
         onYearDatePickerChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent.getSource(), "ID");
        },

        AD_onPressEditDetails: function (oEvent) {
            var sCustomerID = oEvent.getSource().getBindingContext("HostelModel").getObject().BookingID;
            var sEncodedID = btoa(sCustomerID.toString());
            var sMemberID = oEvent.getSource().getBindingContext("HostelModel").getObject().MemberID;
            var sBranchCode = oEvent.getSource().getBindingContext("HostelModel").getObject().BranchCode;


            this.getOwnerComponent().getRouter().navTo("RouteAdminDetails", {
                sPath: encodeURIComponent(sEncodedID),
                from: "Customerdetails",
                BranchCode:sBranchCode
            });
        },

        createTableSheet: function () {
            return [
                {
                    label: "Branch Code",
                    property: "BranchName",
                    type: "string"
                },
                {
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
                    label: "Coupon Code",
                    property: "CouponCode",
                    type: "string"
                },
                {
                    label: "Total Cost",
                    property: "RentPrice",
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
                EndDate: Formatter.formatDate(item.EndDate),
                MobileNo: item.STDCode + " " + item.MobileNo
                // Pincode: item.Pincode ? String(item.Pincode) : "",
                // Contact: item.Contact ? String(item.Contact) : ""
            }));
            const aCols = this.createTableSheet();
            const oSettings = {
                workbook: {
                    columns: aCols,
                    hierarchyLevel: "Level",
                    context: {
                        sheetName: "Admin Details"
                    }
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
        },
      HM_sendreminder: function () {
    var oView = this.getView();

    if (!this.SR_Dialog) {
        this.SR_Dialog = sap.ui.xmlfragment(
            oView.getId(),
            "sap.ui.com.project1.fragment.SendReminder",
            this
        );

        oView.addDependent(this.SR_Dialog);
    }

    this.SR_Dialog.open();

    var aControls = this.SR_Dialog.findAggregatedObjects(true, function (oControl) {
        return oControl instanceof sap.m.Input ||
            oControl instanceof sap.m.ComboBox ||
            oControl instanceof sap.m.Select ||
            oControl instanceof sap.m.TextArea;
    });

    aControls.forEach(function (oControl) {

        // Reset Input / TextArea
        if (oControl instanceof sap.m.Input ||
            oControl instanceof sap.m.TextArea) {

            oControl.setValue("");
            oControl.setValueState("None");
        }

        // Reset ComboBox / Select
        if (oControl instanceof sap.m.ComboBox ||
            oControl instanceof sap.m.Select) {

            oControl.setSelectedKey("");
            oControl.setValueState("None");
        }
    });

    // Reset Year DatePicker
    this.byId("idYearDatePicker").setValue("");
},
onsendreminder: async function () {
    try {

        if (
            !utils._LCstrictValidationComboBox(
                this.getView().byId("id_Branchname"), "ID"
            ) ||
            !utils._LCstrictValidationComboBox(
                this.getView().byId("id_Type"), "ID"
            ) ||
            (
                this.flag === true &&
                !utils._LCstrictValidationComboBox(
                    this.getView().byId("id_month"), "ID"
                )
            ) ||
            !utils._LCvalidateMandatoryField(
                this.getView().byId("idYearDatePicker"), "ID"
            )
        ) {
            sap.m.MessageToast.show(
                this.i18nModel.getText(
                    "pleaseFillallRequiredFieldsCorrectlybeforeSaving"
                )
            );
            return;
        }

        var sBranchcode = this.byId("id_Branchname").getSelectedKey();
        var Type = this.byId("id_Type").getSelectedKey();
        var Month = this.byId("id_month").getSelectedKey();
        var WMonth = this.byId("id_month")?.getSelectedItem()?.getText();
        var Year = this.byId("idYearDatePicker")?.getDateValue()?.getFullYear();

        var oHostel = this.getView()
            .getModel("HostelModel")
            .getData()
            .find(function (item) {
                return item.BranchCode === sBranchcode;
            });

        var filters = {
            BranchCode: sBranchcode,
            PaymentType: Type,
            Month: Month,
            Year: Year,
            WMonth: WMonth,
            PropertyType: oHostel ? oHostel.PropertyType : ""
        };

        // API call
        this.getBusyDialog()
        await this.ajaxReadWithJQuery("HM_SendReminder", filters);


        this.closeBusyDialog()

        // Show success only when API call is successful
        sap.m.MessageToast.show("Successfully sent");

        // Close dialog only after successful API call
        if (this.SR_Dialog) {
            this.SR_Dialog.close();
        }

    } catch (error) {

        console.error("Error while sending payment reminder:", error);

        sap.m.MessageBox.error(
            "Failed to send payment reminder. Please try again."
        );
    }
},
      ontypeChange:function(oEvent){
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");

            var Type=this.byId("id_Type").getSelectedKey()
              if(Type==="Per Month"){
              this.byId("id_month").setEnabled(true)
              this.byId("id_Label").setRequired(true)
              this.flag=true
            }else{
              this.byId("id_month").setEnabled(false).setValue("")
              this.byId("id_Label").setRequired(false)
              this.flag=false
                  }
      },
        onEditDialogClose:function(){
            this.SR_Dialog.close();
        },




        onRoomAvailability: function () {
            if (!this.RoomAvailabilityDialog) {
                this.RoomAvailabilityDialog = sap.ui.xmlfragment(
                    this.getView().getId(),
                    "sap.ui.com.project1.fragment.Room_Availability",
                    this
                );
                this.getView().addDependent(this.RoomAvailabilityDialog);
            }

            this.getView().setModel(
                new JSONModel({ BranchCode: "", BedTypeName: "", StartDate: "", EndDate: "" }),
                "RoomAvailabilityFilter"
            );
            this.getView().setModel(new JSONModel([]), "RoomAvailabilityModel");
            this.getView().setModel(new JSONModel([]), "RoomAvailabilityTypes");

            // Reset stale value states from a previous dialog session
            ["roomAvailabilityBranch", "roomAvailabilityType", "roomAvailabilityStartDate", "roomAvailabilityEndDate"].forEach(function (sId) {
                var oCombo = this.byId(sId);
                if (oCombo) {
                    oCombo.setValueState("None");
                }
            }.bind(this));

            // Make the date pickers read-only (calendar only, no typing)
            this._FragmentDatePickersReadOnly([
                this.getView().createId("roomAvailabilityStartDate"),
                this.getView().createId("roomAvailabilityEndDate")
            ]);
            this._setRoomAvailabilityDateLimits();

            this.RoomAvailabilityDialog.open();
        },

        _setRoomAvailabilityDateLimits: function () {
            var oToday = new Date();
            oToday.setHours(0, 0, 0, 0);

            var oMaxDate = new Date(oToday);
            oMaxDate.setFullYear(oMaxDate.getFullYear() + 30);

            var oStartPicker = this.byId("roomAvailabilityStartDate");
            var oEndPicker = this.byId("roomAvailabilityEndDate");
            var oStartDate = oStartPicker && oStartPicker.getDateValue();

            if (oStartPicker) {
                oStartPicker.setMinDate(oToday).setMaxDate(oMaxDate);
            }
            if (oEndPicker) {
                oEndPicker.setMinDate(oStartDate || oToday).setMaxDate(oMaxDate);
            }
        },

        onRoomAvailabilityBranchChange: function (oEvent) {
            var sBranchCode = oEvent.getSource().getSelectedKey();
            var aRooms = this._getRoomRecords();
            var aTypes = aRooms
                .filter(function (oRoom) { return !sBranchCode || oRoom.BranchCode === sBranchCode; })
                .reduce(function (aResult, oRoom) {
                    if (oRoom.BedTypeName && !aResult.some(function (oType) { return oType.BedTypeName === oRoom.BedTypeName; })) {
                        aResult.push({ BedTypeName: oRoom.BedTypeName });
                    }
                    return aResult;
                }, [])
                .sort(function (a, b) { return a.BedTypeName.localeCompare(b.BedTypeName); });

            this.getView().getModel("RoomAvailabilityFilter").setProperty("/BedTypeName", "");
            this.getView().getModel("RoomAvailabilityTypes").setData(aTypes);
            this.getView().getModel("RoomAvailabilityModel").setData([]);
        },

        _getRoomRecords: function () {
            var oModel = this.getOwnerComponent().getModel("RoomDetailsModel");
            return oModel && Array.isArray(oModel.getData()) ? oModel.getData().filter(Boolean) : [];
        },

        // HM_Rooms stores the combined "BedType - ACType" in BedTypeName.
        // HM_ConfirmAvailableRooms expects them as separate Name and ACType params.
        _splitBedTypeName: function (sBedTypeName) {
            var sName = sBedTypeName || "";
            var iSep = sName.lastIndexOf(" - ");
            if (iSep > -1) {
                return {
                    Name: sName.slice(0, iSep).trim(),
                    ACType: sName.slice(iSep + 3).trim()
                };
            }
            return { Name: sName.trim(), ACType: "" };
        },


        onRoomAvailabilityFieldChange: function (oEvent) {
            var oInput = oEvent.getSource();

            if (oInput instanceof sap.m.ComboBox) {
                var bValidSelection = utils._LCstrictValidationComboBox(oInput, "ID");
                if (!bValidSelection) {
                    oInput.setSelectedKey("").setValue("");
                }
            } else if (oInput instanceof sap.m.DatePicker) {
                if (!oInput.getValue()) {
                    oInput.setValueState("None");
                } else if (oInput.getDateValue()) {
                    // DatePicker valueFormat is yyyy-MM-dd, while the shared
                    // date validator expects the display format dd/MM/yyyy.
                    oInput.setValueState("None");
                } else {
                    oInput.setValueState("Error");
                }

                if (oInput.getId().endsWith("roomAvailabilityStartDate")) {
                    var oEndPicker = this.byId("roomAvailabilityEndDate");
                    if (oEndPicker) {
                        oEndPicker.setDateValue(null);
                        oEndPicker.setValueState("None");
                    }
                    this._setRoomAvailabilityDateLimits();
                }
            }
        },

        onLoadRoomAvailability: async function () {
            var oBranchCombo = this.byId("roomAvailabilityBranch");
            var oTypeCombo = this.byId("roomAvailabilityType");

            // Validate one after another: stop at the first invalid field
            // (focus stays on the offending combo instead of jumping ahead).
            if (!utils._LCstrictValidationComboBox(oBranchCombo, "ID")) {
                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return;
            }
            if (!utils._LCstrictValidationComboBox(oTypeCombo, "ID")) {
                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return;
            }

            var oStartPicker = this.byId("roomAvailabilityStartDate");
            var oEndPicker = this.byId("roomAvailabilityEndDate");

            if (!oStartPicker.getDateValue() || oStartPicker.getValueState() === "Error") {
                oStartPicker.setValueState("Error");
                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return;
            }

            // DatePicker sets Error state itself on unparseable input.
            if (!oEndPicker.getDateValue() || oEndPicker.getValueState() === "Error") {
                oEndPicker.setValueState("Error");
                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return;
            }

            var sStartDate = oStartPicker.getDateValue()
                ? oStartPicker.getValue() // already yyyy-MM-dd via valueFormat
                : "";
            var sEndDate = oEndPicker.getDateValue()
                ? oEndPicker.getValue()
                : "";

            // If both dates are given, End Date must not precede Start Date
            if (sStartDate && sEndDate && sEndDate < sStartDate) {
                oEndPicker.setValueState("Error")
                    .setValueStateText(this.i18nModel.getText("endDatecannotbeearlierthanStartDate"));
                MessageToast.show(this.i18nModel.getText("endDatecannotbeearlierthanStartDate"));
                return;
            }

            var sBranchCode = oBranchCombo.getSelectedKey() || oBranchCombo.getValue();
            var sBedTypeName = oTypeCombo.getSelectedKey() || oTypeCombo.getValue();

            var aBranches = this.getView().getModel("BranchModel")?.getData() || [];
            var oBranch = aBranches.find(function (b) { return b.BranchID === sBranchCode; });
            var sPropertyType = (oBranch && oBranch.PropertyType) || "Hostel";

            var aBedTypeNames = [sBedTypeName];

            if (!aBedTypeNames.length) {
                this.getView().getModel("RoomAvailabilityModel").setData([]);
                MessageToast.show(this.i18nModel.getText("noRoomsFound"));
                return;
            }

            this.getBusyDialog();
            try {
                var aRows = await Promise.all(aBedTypeNames.map(async function (sName) {
                    var oParts = this._splitBedTypeName(sName);
                    try {
                        var oResponse = await this.ajaxReadWithJQuery("HM_ConfirmAvailableRooms", {
                            BranchCode: sBranchCode,
                            ACType: oParts.ACType,
                            Name: oParts.Name,
                            PropertyType: sPropertyType,
                            StartDate: sStartDate,
                            EndDate: sEndDate
                        });

                        if (!oResponse || oResponse.success === false) {
                            return {
                                BedTypeName: sName,
                                TotalCapacity: "-",
                                BookedCount: "-",
                                AvailableCount: "-",
                                AvailabilityStatus: "Error",
                                AvailabilityState: "Error"
                            };
                        }

                        // Derive availability from availableCount (the backend "available"
                        // flag stays true even when the bed type is fully booked).
                        var iAvailable = parseInt(oResponse.availableCount, 10);
                        if (isNaN(iAvailable)) {
                            iAvailable = (parseInt(oResponse.totalCapacity, 10) || 0)
                                - (parseInt(oResponse.bookedCount, 10) || 0);
                        }
                        var bIsAvailable = iAvailable > 0;

                        return {
                            BedTypeName: sName,
                            TotalCapacity: oResponse.totalCapacity,
                            BookedCount: oResponse.bookedCount,
                            AvailableCount: oResponse.availableCount,
                            StartDate: sStartDate,
                            EndDate: sEndDate,
                            AvailabilityStatus: bIsAvailable ? "Available" : "Fully Booked",
                            AvailabilityState: bIsAvailable ? "Success" : "Error"
                        };
                    } catch (oError) {
                        return {
                            BedTypeName: sName,
                            TotalCapacity: "-",
                            BookedCount: "-",
                            AvailableCount: "-",
                            StartDate: sStartDate,
                            EndDate: sEndDate,
                            AvailabilityStatus: "Error",
                            AvailabilityState: "Error"
                        };
                    }
                }.bind(this)));

                this.getView().getModel("RoomAvailabilityModel").setData(aRows);
            } finally {
                this.closeBusyDialog();
            }
        },

        onRoomAvailabilityClose: function () {
            this.RoomAvailabilityDialog.close();
        },

    });
});