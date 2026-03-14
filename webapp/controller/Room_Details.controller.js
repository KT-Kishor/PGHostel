sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../utils/validation",
    "sap/m/MessageToast",
    "sap/ui/export/Spreadsheet",
    "../model/formatter"
], function (BaseController, JSONModel, utils, MessageToast, Spreadsheet, Formatter) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.Room_Details", {
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteRoomDetails").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function () {
            var LoginFUnction = await this.commonLoginFunction("ManageRooms");
            if (!LoginFUnction) return;

            var oView = this.getView();
            var oModel = oView.getModel("RoomDetailsModel");

            if (!oModel) {
                oModel = new sap.ui.model.json.JSONModel({});
                oView.setModel(oModel, "RoomDetailsModel");
            } else {
                oModel.setData({});
            }
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();

            var model = new JSONModel({
                BranchCode: "",
                RoomNo: "",
                Price: "",
                editable: true
            });
            this.getView().setModel(model, "RoomModel")
            this.onClearAndSearch("RD_id_FilterbarEmployee");
            this.getBusyDialog()
            await this.BedTypedetails()
            await this._loadBranchCode()
            await this.Onsearch()
            this.Customerdata()

            //  this.closeBusyDialog()

        },
        Customerdata: function () {
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
                filters.BranchCode = aBranchCodes;
                filters.Role = "Admin";
            } else if (oExistingModel.Role === "SuperAdmin") {
                filters.BranchCode = "";
            } else {
                filters.BranchCode = oExistingModel.BranchCode;
            }
            this.ajaxReadWithJQuery("HM_Customer", filters).then((response) => {

                const oModel = new sap.ui.model.json.JSONModel(response.Customers);
                this.getView().setModel(oModel, "HostelModel");

                this.closeBusyDialog()
            }).catch(() => this.closeBusyDialog());
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
                filters.Role = "Admin";
            } else if (oExistingModel.Role === "SuperAdmin") {
                filters.BranchID = "";
            } else {
                filters.BranchID = oExistingModel.BranchCode;
            }
            try {
                const oView = this.getView();

                const oResponse = await this.ajaxReadWithJQuery("HM_BranchData", filters);

                const aBranches = Array.isArray(oResponse?.data)
                    ? oResponse.data
                    : (oResponse?.data ? [oResponse.data] : []);

                const oBranchModel = new sap.ui.model.json.JSONModel(aBranches);
                oView.setModel(oBranchModel, "BranchModel");
            } catch (err) {
                console.error("Error while loading branch data:", err);
            }
        },

        RD_onDownload: function () {
            const oModel = this.byId("id_ARD_Table").getModel("RoomDetailsModel").getData();
            if (!oModel || oModel.length === 0) {
                MessageToast.show(this.i18nModel.getText("MSnodata"));
                return;
            }
            const adjustedData = oModel.map(item => ({
                ...item,
                Price: item.Price ? String(item.Price) : "",
                MonthPrice: item.MonthPrice ? String(item.MonthPrice) : "",
                YearPrice: item.YearPrice ? String(item.YearPrice) : "",
                Price: item.Price + " " + item.Currency,
                MonthPrice: item.MonthPrice + " " + item.Currency,
                YearPrice: item.YearPrice + " " + item.Currency
            }));
            const aCols = this.createTableSheet();
            const oSettings = {
                workbook: {
                    columns: aCols,
                    hierarchyLevel: "Level",
                    context: {
                        sheetName: "Room Details Details"
                    }
                },
                dataSource: adjustedData,
                fileName: "Room_Details.xlsx",
                worker: false,
            };
            MessageToast.show(this.i18nModel.getText("downloadingRoomDetails"));
            const oSheet = new Spreadsheet(oSettings);
            oSheet.build().finally(function () {
                oSheet.destroy();
            });
        },

        createTableSheet: function () {
            return [{
                label: "Hostel Name",
                property: "BranchName",
                type: "string"
            },
            {
                label: "Room Number",
                property: "RoomNo",
                type: "string"
            },
            {
                label: "Bed Type",
                property: "BedTypeName",
                type: "string"
            },
            {
                label: "Daily Price",
                property: "Price",
                type: "string"
            },
            {
                label: "Monthly Price",
                property: "MonthPrice",
                type: "string"
            },
            {
                label: "Yearly Price",
                property: "YearPrice",
                type: "string"
            }
            ]
        },

        BedTypedetails: function () {
            this.ajaxReadWithJQuery("HM_BedType", "").then((oData) => {
                var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                var model = new JSONModel(oFCIAerData);
                this.getView().setModel(model, "BedTypeModel");
                this._aAllBedTypes = oFCIAerData;
            })
        },

        _populateUniqueFilterValues: function (data) {
            let uniqueValues = {
                RD_id_CustomerName1: new Set(),
                RD_id_CompanyName1: new Set(),

            };

            data.forEach(item => {
                uniqueValues.RD_id_CustomerName1.add(item.RoomNo);
                uniqueValues.RD_id_CompanyName1.add(item.BedTypeName);
            });

            let oView = this.getView();
            ["RD_id_CustomerName1", "RD_id_CompanyName1"].forEach(field => {
                let oComboBox = oView.byId(field);
                oComboBox.destroyItems();
                Array.from(uniqueValues[field]).sort().forEach(value => {
                    oComboBox.addItem(new sap.ui.core.Item({
                        key: value,
                        text: value
                    }));
                });
            });
        },

        HM_AddRoom: function (oEvent) {
            var oView = this.getView();
            this.byId("id_ARD_Table").removeSelections();

            // Load dialog fragment (only once)
            if (!this.AR_Dialog) {
                this.AR_Dialog = sap.ui.xmlfragment(
                    oView.getId(),
                    "sap.ui.com.project1.fragment.Add_Room_Details",
                    this
                );
                oView.addDependent(this.AR_Dialog);
            }

            // Reset RoomModel fields
            var oRoomModel = oView.getModel("RoomModel");
            if (oRoomModel) {
                oRoomModel.setData({
                    BranchCode: "",
                    BedTypeName: "",
                    NoofPerson: "",
                    RoomNo: "",
                    Price: "",
                    _isEditing: false
                });
            }

            // Hide optional fields
            oView.byId("idBedType").setEnabled(false);
            // oView.byId("idAcType").setVisible(false);

            // Reset ValueState for inputs
            var aInputIds = [
                "idRoomType12",
                "idBedType",
                "idRoomNumber",
                "idRoomNumber13",
                "idPrice",
                "FO_id_Currency"
            ];

            aInputIds.forEach(function (sId) {
                var oInput = oView.byId(sId);
                if (oInput && oInput.setValueState) {
                    oInput.setValueState("None");
                }
            });

            // --- Models ---
            var oBedTypeModel = oView.getModel("BedTypeModel");
            var oRoomDetailsModel = oView.getModel("RoomDetailsModel");

            var aBedTypes = oBedTypeModel.getProperty("/");
            // this._aAllBedTypes=oBedTypeModel.getProperty("/")
            var aRoomDetails = oRoomDetailsModel.getProperty("/");

            // --- Backup BedTypeModel if not already done ---
            if (this._aOriginalBedTypes && this._aOriginalBedTypes.length) {
                oBedTypeModel.setProperty("/", JSON.parse(JSON.stringify(this._aOriginalBedTypes)));
                aBedTypes = oBedTypeModel.getProperty("/");
            } else {
                // Backup original only once
                this._aOriginalBedTypes = JSON.parse(JSON.stringify(aBedTypes));
            }

            // --- Filter Logic ---
            var aFiltered = aBedTypes.filter(function (bed) {
                // Bed side person capacity
                var iBedNoOfPerson = bed.MaxBeds || 0;

                // Sum all NoofPerson for rooms with same BranchCode & BedTypeName
                var iRoomNoOfPerson = aRoomDetails.filter(function (room) {
                    return (
                        room.BranchCode === bed.BranchCode &&
                        room.BedTypeName === bed.Name + " - " + bed.ACType
                    );
                })
                    .reduce(function (sum, room) {
                        return sum + (parseInt("1") || 0);
                    }, 0);

                // Only include bed types that haven't reached capacity
                return iBedNoOfPerson > iRoomNoOfPerson;
            });

            // Update filtered data for dropdown
            oBedTypeModel.setProperty("/", aFiltered);

            // --- Open Dialog ---
            this.AR_Dialog.open();
        },

        onBranchChange: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
            var oView = this.getView();
            var sBranchCode = oEvent.getParameter("selectedItem").getKey();
            // Models
            var oBedTypeModel = oView.getModel("BedTypeModel");
            var oRoomDetailsModel = oView.getModel("RoomDetailsModel");
            var oCurrencyModel = oView.getModel("BranchModel").getData();

            var oCountryModel = this.getView().getModel("CountryModel").getData();

            var Branch = oCurrencyModel.find((item) => {
                return item.BranchID === sBranchCode
            })

            var Currency = oCountryModel.find((item) => {
                return item.countryName === Branch.Country
            })
            this.getView().getModel("RoomModel").setProperty("/Currency", Currency.currency);
            // Get all bed types (from a backup copy)
            var aAllBedTypes = this._aAllBedTypes || oBedTypeModel.getProperty("/");
            this._aAllBedTypes = aAllBedTypes; // store once

            var aRoomDetails = oRoomDetailsModel.getProperty("/");

            // Filter only the bed types for the selected branch
            var aFiltered = aAllBedTypes.filter(function (bed) {
                return bed.BranchCode === sBranchCode


            });

            // Set filtered data (for dropdown binding)
            oBedTypeModel.setProperty("/", aFiltered);

            // Reset UI selections
            var oBedTypeCombo = oView.byId("idBedType");
            oBedTypeCombo.setSelectedKey("").setEnabled(true);


        },

        onBedTypeChange: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");

            var oInput = oEvent.getSource().getValue();
            var oModel = this.getView().getModel("RoomModel");
            var BranchCode = oModel.getProperty("/BranchCode");
            var data = this.getView().getModel("RoomDetailsModel").getData();

            var oMatch = data.find(item =>
                item.BedTypeName === oInput &&
                item.BranchCode === BranchCode
            );

            if (oMatch) {
                oModel.setProperty("/Price", oMatch.Price);
                oModel.setProperty("/MonthPrice", oMatch.MonthPrice);
                oModel.setProperty("/YearPrice", oMatch.YearPrice);
                oModel.setProperty("/Currency", oMatch.Currency);
                oModel.setProperty("/editable", false);
            } else {
                oModel.setProperty("/Price", "");
                oModel.setProperty("/MonthPrice", "");
                oModel.setProperty("/YearPrice", "");
                oModel.setProperty("/editable", true);
            }
        },
        HM_EditRoom: function (oEvent) {
            var oView = this.getView();
            var oTable = this.byId("id_ARD_Table");
            var oSelected = oTable.getSelectedItems();

            if (!oSelected || oSelected.length === 0) {
                sap.m.MessageToast.show(this.i18nModel.getText("pleaseSelectRecordEditRoom"));
                return;
            }
            if (oSelected.length > 1) {
                sap.m.MessageToast.show(this.i18nModel.getText("pleaseselectonlyonerowtoedit"));
                return;
            }

            var oContext = oSelected[0].getBindingContext("RoomDetailsModel");
            var oData = oContext.getObject();



            // Create dialog if not already initialized
            if (!this.AR_Dialog) {
                this.AR_Dialog = sap.ui.xmlfragment(
                    oView.getId(),
                    "sap.ui.com.project1.fragment.Add_Room_Details",
                    this
                );
                oView.addDependent(this.AR_Dialog);
            }

            // Prepare RoomModel with selected data
            var oRoomModel = oView.getModel("RoomModel");
            oRoomModel.setData({
                ...oData,
                _isEditing: true
            });
            this.RoomNo = oData.RoomNo
            this.BedTypeName = oData.BedTypeName

            var sBranchCode = oData.BranchCode;

            // --- Models ---
            var oBedTypeModel = oView.getModel("BedTypeModel");
            var oRoomDetailsModel = oView.getModel("RoomDetailsModel");

            // Get all bed types (use backup if available)
            var aAllBedTypes = this._aAllBedTypes || oBedTypeModel.getProperty("/");
            this._aAllBedTypes = aAllBedTypes;

            var aRoomDetails = oRoomDetailsModel.getProperty("/");

            // --- Filter Logic with SUM of NoofPerson ---
            var aFiltered = aAllBedTypes.filter(function (bed) {
                if (bed.BranchCode !== sBranchCode) {
                    return false;
                }

                // Bed capacity
                var iBedNoOfPerson = bed.MaxBeds || 0;

                // Sum NoofPerson for all matching rooms
                var iRoomNoOfPerson = aRoomDetails.filter(function (room) {
                    return (
                        room.BranchCode === sBranchCode &&
                        room.BedTypeName === bed.Name + " - " + bed.ACType
                    );
                })
                    .reduce(function (sum, room) {
                        return sum + (parseInt("1") || 0);
                    }, 0);

                // Check if this is the current room’s bed
                var bIsCurrentBed =
                    oData.BedTypeName === bed.Name + " - " + bed.ACType &&
                    oData.BranchCode === bed.BranchCode;

                // Include if capacity not reached or if it's the current bed
                return bIsCurrentBed || iBedNoOfPerson > iRoomNoOfPerson;
            });

            // --- If BedType is full, lock dropdown to current one ---
            var oCurrentBedType = aFiltered.find(function (bed) {
                return (
                    bed.Name + " - " + bed.ACType === oData.BedTypeName &&
                    bed.BranchCode === oData.BranchCode
                );
            });

            var oDropdown = oView.byId("idBedType");

            if (aFiltered.length === 1 && oCurrentBedType) {
                // Already full — lock dropdown to this one
                oBedTypeModel.setProperty("/", [oCurrentBedType]);
                if (oDropdown) {
                    oDropdown.setSelectedKey(oData.BedTypeName);
                    // oDropdown.setEnabled(false);
                }
            } else {
                // Otherwise allow selection normally
                oBedTypeModel.setProperty("/", aFiltered);
                if (oDropdown) {
                    // oDropdown.setEnabled(true);
                    oDropdown.setSelectedKey(oData.BedTypeName);
                }
            }

            // Show BedType field
            oView.byId("idBedType").setEnabled(true);

            // Reset input ValueState
            var aInputIds = [
                "idRoomType12",
                "idBedType",
                "idRoomNumber",
                "idRoomNumber13",
                "idPrice",
                "id_MonthlyPrice",
                "id_YearlyPrice",
                "FO_id_Currency"
            ];
            aInputIds.forEach(function (sId) {
                var oInput = oView.byId(sId);
                if (oInput && oInput.setValueState) {
                    oInput.setValueState("None");
                }
            });

            // --- Open Dialog ---
            this.AR_Dialog.open();
        },

        AR_onCancelButtonPress: function () {

            this.AR_Dialog.close();
            var table = this.byId("id_ARD_Table");
            table.removeSelections(true);
        },

        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
            this.getView().getModel("RoomDetailsModel").setData({});

        },

        AR_onsavebuttonpress: function () {
            var oView = this.getView();
            var oRoomModel = oView.getModel("RoomModel");
            var oRoomDetailsModel = oView.getModel("RoomDetailsModel");
            var oBedTypeModel = oView.getModel("BedTypeModel");


            var BranchCode = oRoomModel.getProperty("/BranchCode");
            var Payload = oRoomModel.getData();

            // Remove unnecessary fields
            delete Payload.AcType;
            delete Payload.File;
            delete Payload.Description;
            delete Payload.editable
            delete Payload.BranchName

            var aRoomDetails = oRoomDetailsModel.getData();
            var aBedTypes = oBedTypeModel.getData();
            var Noofper = aBedTypes.find(function (bed) {
                const bedName = Payload.BedTypeName.replace(/\s*-\s*(AC|NON-AC)$/i, "").trim();
                const acType = Payload.BedTypeName.includes("NON-AC") ? "NON-AC" : "AC";

                return bed.BranchCode === Payload.BranchCode &&
                    bed.Name.trim() === bedName &&
                    bed.ACType === acType;
            });


            // Field validations
            if (
                utils._LCstrictValidationComboBox(oView.byId("idRoomType12"), "ID") &&
                // utils._LCstrictValidationComboBox(oView.byId("idBedType"), "ID") &&
                (utils._LCstrictValidationComboBox(oView.byId("idBedType"), "ID") || Payload.BedTypeName) &&
                utils._LCvalidateMandatoryField(oView.byId("idRoomNumber"), "ID") &&
                // utils._LCvalidateMandatoryField(oView.byId("idRoomNumber13"), "ID") &&
                utils._LCstrictValidationComboBox(oView.byId("FO_id_Currency"), "ID")

            ) {

                Payload.NoofPerson = parseInt(Noofper.NoOfPerson) || 0;
                Payload.ExtraBed = parseInt(Payload.ExtraBed) || 0;
                Payload.Price = Payload.Price || 0;
                Payload.MonthPrice = parseInt(Payload.MonthPrice) || 0;
                Payload.YearPrice = parseInt(Payload.YearPrice) || 0;

                // Check if RoomNo already exists
                var oExistingRoom = aRoomDetails.find(function (room) {
                    return room.RoomNo === Payload.RoomNo;
                });

                var selectedBedTypeName = Payload.BedTypeName.replace(/\s*-\s*(AC|NON-AC)$/i, "").trim();
                var selectedACType = Payload.BedTypeName.includes("NON-AC") ? "NON-AC" : "AC";;
                var aFiltered = aBedTypes.filter(function (bed) {

                    // Only check selected Bed Type
                    if (
                        bed.BranchCode !== Payload.BranchCode ||
                        bed.Name !== selectedBedTypeName ||
                        bed.ACType !== selectedACType
                    ) {
                        return false;
                    }

                    // Count existing rooms for this bed type
                    var iCreatedCount = aRoomDetails.filter(function (room) {
                        return (
                            room.BranchCode === Payload.BranchCode &&
                            room.BedTypeName === bed.Name + " - " + bed.ACType
                        );
                    }).length;

                    // Check if more rooms can be created
                    return iCreatedCount < Number(bed.MaxBeds);
                });


                if (aFiltered.length === 0 && !Payload._isEditing) {
                    sap.m.MessageToast.show(this.i18nModel.getText("allRoomsforthisBedTypeAlreadyCreated"));
                    var oMatch = aRoomDetails.find(item =>
                        item.BedTypeName === Payload.BedTypeName &&
                        item.BranchCode === BranchCode
                    );

                    if (oMatch) {

                        oRoomModel.setProperty("/editable", false);
                    } else {

                        oRoomModel.setProperty("/editable", true);
                    }
                    return;
                }

                if (oExistingRoom && !Payload._isEditing && oExistingRoom.RoomNo === Payload.RoomNo) {
                    sap.m.MessageToast.show("Room No '" + Payload.RoomNo + "' Already Exists");
                    var oMatch = aRoomDetails.find(item =>
                        item.BedTypeName === Payload.BedTypeName &&
                        item.BranchCode === BranchCode
                    );

                    if (oMatch) {

                        oRoomModel.setProperty("/editable", false);
                    } else {

                        oRoomModel.setProperty("/editable", true);
                    }
                    return;
                }
                if (Payload._isEditing) {
                    // Editing case
                    var sOriginalRoomNo = this.RoomNo; // We'll store this when opening dialog

                    if (oExistingRoom && Payload.RoomNo !== sOriginalRoomNo) {
                        sap.m.MessageToast.show("Room No '" + Payload.RoomNo + "' Already Exists");
                        return;
                    }
                }
                if (Payload.Price <= 0 && Payload.MonthPrice <= 0 && Payload.YearPrice <= 0) {
                    sap.m.MessageToast.show(this.i18nModel.getText("pleaseFillatLeastOnePrice"));
                    oRoomModel.setProperty("/Price", "");
                    oRoomModel.setProperty("/MonthPrice", "");
                    oRoomModel.setProperty("/YearPrice", "");
                    return;
                }



                var sUrl = "https://rest.kalpavrikshatechnologies.com/HM_Rooms";
                var sMethod = "POST";
                var oBody = {
                    data: Payload
                };


                if (Payload._isEditing === true) {
                    // Always do PUT when editing
                    sMethod = "PUT";
                    oBody.filters = {
                        RoomNo: this.RoomNo      // Original RoomNo before edit
                    };
                }

                delete Payload._isEditing;
                this.getBusyDialog()

                $.ajax({
                    url: sUrl,
                    method: sMethod,
                    contentType: "application/json",
                    headers: {
                        name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                        password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
                    },
                    data: JSON.stringify(oBody),
                    success: function (response) {
                        sap.m.MessageToast.show(
                            sMethod === "POST" ?
                                "Room Added Successfully!" :
                                "Room Updated Successfully!"
                        );
                        this.Onsearch("true");
                        this.BedTypedetails()

                        this.AR_Dialog.close();
                    }.bind(this),
                    error: function (err) {
                        sap.m.MessageBox.error(this.i18nModel.getText("errorSavingRoomData"));
                       this.closeBusyDialog()
                    }.bind(this)
                });
            } else {
                sap.m.MessageToast.show(this.i18nModel.getText("pleaseFillallRequiredFieldsCorrectlybeforeSaving"));
                return;
            }
        },
        HM_DeleteRoom: function () {
            var CustData = this.getView().getModel("HostelModel").getData();
            var table = this.byId("id_ARD_Table");
            var aSelectedItems = table.getSelectedItems();

            // No selection
            if (aSelectedItems.length === 0) {
                sap.m.MessageToast.show(
                    this.i18nModel.getText("pleaseSelectatLeastOneRecordtoDelete")
                );
                return;
            }

            var aAssignedRooms = [];
            var aDeletableRooms = [];
            var aAssignedBedsdisplay = [];


            // Split assigned & non-assigned rooms
            aSelectedItems.forEach(item => {
                var oRoom = item
                    .getBindingContext("RoomDetailsModel")
                    .getObject();

                var bAssigned = CustData.some(cust =>
                    cust.BranchCode === oRoom.BranchCode &&
                    cust.BedType === oRoom.BedTypeName &&
                    cust.Status === "Assigned"
                );

                if (bAssigned) {
                    aAssignedRooms.push(oRoom.RoomNo);
                } else {
                    aDeletableRooms.push({
                        roomNo: oRoom.RoomNo,
                        item: item
                    });
                }
            });

            // Single selection & assigned → stop
            if (aSelectedItems.length === 1 && aAssignedRooms.length === 1) {
                sap.m.MessageBox.warning(
                    "Cannot delete! Selected room is already assigned."
                );
                return;
            }

            // All selected rooms are assigned
            if (aDeletableRooms.length === 0) {
                sap.m.MessageBox.warning(
                    "All selected rooms are already assigned and cannot be deleted."
                );
                return;
            }

            // Show only non-assigned room numbers
            var sRoomNos = aDeletableRooms
                .map(room => room.roomNo)
                .join(", ");
            var sAssignedRoomNos = aAssignedRooms.map(room => room).join(", ");

            let sMessage = `Are you sure you want to delete the following room(s): ${sRoomNos}?`;


            if (sRoomNos && sRoomNos.length > 0) {
                sMessage += `\nThese rooms cannot be deleted because they are currently assigned to: ${sAssignedRoomNos}.`;
            }

            sap.m.MessageBox.confirm(
                sMessage,
                {
                    title: "Confirm Deletion",
                    icon: sap.m.MessageBox.Icon.WARNING,
                    actions: [
                        sap.m.MessageBox.Action.OK,
                        sap.m.MessageBox.Action.CANCEL
                    ],
                    styleClass: "myUnifiedBtn",
                    onClose: async function (sAction) {
                        if (sAction === sap.m.MessageBox.Action.OK) {
                            this.getBusyDialog()
                            try {
                                const deletePromises = aDeletableRooms.map(roomObj => {
                                    var data = roomObj.item
                                        .getBindingContext("RoomDetailsModel")
                                        .getObject();

                                    return $.ajax({
                                        url: "https://rest.kalpavrikshatechnologies.com/HM_Rooms",
                                        method: "DELETE",
                                        contentType: "application/json",
                                        data: JSON.stringify({
                                            filters: {
                                                RoomNo: data.RoomNo
                                            }
                                        }),
                                        headers: {
                                            name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                                            password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
                                        }
                                    });
                                });

                                await Promise.all(deletePromises);

                                // Refresh data
                                await this.BedTypedetails();
                                await this.Onsearch("true");

                                sap.m.MessageToast.show(
                                    this.i18nModel.getText("selectedRoomDeletedSuccessfully")
                                );
                            } catch (error) {
                                console.error("Delete Failed:", error);
                                sap.m.MessageBox.error(
                                    this.i18nModel.getText("errorwhileDeletingRoomPleasetryagain")
                                );
                            } finally {
                                // this.closeBusyDialog()
                                table.removeSelections(true);
                            }
                        }
                    }.bind(this)
                }
            );
        },

        Onsearch: function (flag) {
            const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();
            const omainModel = this.getOwnerComponent().getModel("mainModel")?.getData() || [];

            var oView = this.getView();

            var oFilterBar = oView.byId("RD_id_FilterbarEmployee");

            var oTable = oView.byId("id_ARD_Table");
            var oBinding = oTable.getBinding("items");

            var sRoomNo = oView.byId("RD_id_CustomerName1").getSelectedKey() || oView.byId("RD_id_CustomerName1").getValue();
            var sbedtype = oView.byId("RD_id_CompanyName1").getSelectedKey() || oView.byId("RD_id_CompanyName1").getValue();

            let aBranchCodes = [];

            if (Array.isArray(omainModel) && omainModel.length) {
                aBranchCodes = omainModel.map(item => item.BranchID).flat().filter(Boolean).join(",");
            } else if (oExistingModel.BranchCode) {
                aBranchCodes = oExistingModel.BranchCode
                    .split(",")
                    .map(code => code.trim());
            }

            let filters = {};

            if (oExistingModel.Role === "Admin") {
                filters = { BranchCode: aBranchCodes };
                filters.Role = "Admin";
            } else if (oExistingModel.Role === "SuperAdmin") {
                filters.BranchCode = "";
            } else {
                filters.BranchCode = oExistingModel.BranchCode;
            }

            if (sRoomNo) {
                filters.RoomNo = sRoomNo
            }
            if (sbedtype) {
                filters.BedTypeName = sbedtype
            }

            this.getBusyDialog()
            this.ajaxReadWithJQuery("HM_Rooms", filters).then((oData) => {

                const roomData = Array.isArray(oData.commentData) ? oData.commentData : [];

                const branchData = this.getView().getModel("BranchModel")?.getData() || [];

                // Map BranchCode → BranchName
                const mappedData = roomData.map(bed => {
                    const branch = branchData.find(br => br.BranchID === bed.BranchCode);
                    return {
                        ...bed,
                        BranchName: branch ? branch.Name : bed.BranchCode // fallback
                    };
                });

                if (!this._originalRoomdata || flag === "true") {
                    this._originalRoomdata = mappedData;
                }
                var model = new JSONModel(mappedData);
                this.getView().setModel(model, "RoomDetailsModel");
                this._populateUniqueFilterValues(this._originalRoomdata);
                this.closeBusyDialog()
            })
        },

        RD_onSearch: function () {
            var oView = this.getView();

            var oFilterBar = oView.byId("RD_id_FilterbarEmployee");

            var oTable = oView.byId("id_ARD_Table");
            var oBinding = oTable.getBinding("items");

            var sCustomerName = oView.byId("RD_id_CustomerName1").getSelectedKey() || oView.byId("RD_id_CustomerName1").getValue();
            var sCustomerID = oView.byId("RD_id_CompanyName1").getSelectedKey() || oView.byId("RD_id_CompanyName1").getValue();

            var aFilters = [];

            if (sCustomerName) {
                aFilters.push(new sap.ui.model.Filter("RoomNo", sap.ui.model.FilterOperator.Contains, sCustomerName));
            }

            if (sCustomerID) {
                aFilters.push(new sap.ui.model.Filter("BedTypeName", sap.ui.model.FilterOperator.Contains, sCustomerID));
            }

            var oCombinedFilter = new sap.ui.model.Filter({
                filters: aFilters,
                and: true
            });

            oBinding.filter(oCombinedFilter);
        },

        RD_onPressClear: function () {
            this.getView().byId("RD_id_CustomerName1").setSelectedKey("")
            this.getView().byId("RD_id_CompanyName1").setSelectedKey("")
        },

        onRoomNoInputLiveChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent.getSource(), "ID");
        },

        onPriceInputLiveChange: function (oEvent) {
            const oInput = oEvent.getSource();
            let sValue = oInput.getValue();

            // Allow digits and one decimal point
            sValue = sValue.replace(/[^0-9.]/g, "");

            // Allow only one decimal point
            const aParts = sValue.split(".");
            if (aParts.length > 2) {
                sValue = aParts[0] + "." + aParts[1];
            }

            // Limit to 2 decimal places
            if (aParts[1]) {
                aParts[1] = aParts[1].substring(0, 2);
                sValue = aParts[0] + "." + aParts[1];
            }

            oInput.setValue(sValue);

        },

        onACtypeChange: function (oEvent) {
            utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
        },

        onHome: function () {
            this.CommonLogoutFunction();
            this.getView().getModel("RoomDetailsModel").setData({});
        },
    });
});