sap.ui.define([
    "./BaseController",
    "../model/formatter",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/export/Spreadsheet",
    "../utils/validation"
], function (BaseController, Formatter, JSONModel, MessageToast, Spreadsheet, utils) {
    "use strict";

    return BaseController.extend("sap.ui.com.project1.controller.Complaint_Details", {
        Formatter: Formatter,

        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteComplaintDetails").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function (oEvent) {
            this.getView().byId("PCD_id_RoomNo").setSelectedKey("")
            this.getView().byId("CD_id_Status").setSelectedKey("")
            this.commonLoginFunction();
            this._ViewDatePickersReadOnly(["CD_id_EstimatedDate", "CD_id_ResolutionDate"],this.getView());

            await this.CD_read(true)
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();

            this.CD_Staff()

        },
        CD_Staff: function () {
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
            } else if (oExistingModel.Role === "SuperAdmin") {
                filters.BranchCode = "";
            } else {
                filters.BranchCode = oExistingModel.BranchCode;
            }
            this.ajaxReadWithJQuery("HM_StaffContact", filters).then((oData) => {
                var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];


                // Map BranchCode to BranchName directly in response
                var Staffmodel = new JSONModel(oFCIAerData);
                this.getView().setModel(Staffmodel, "StaffModel");


            })
            this.closeBusyDialog()
        },
        CD_Search:function(){
            if(!this.byId("PCD_id_RoomNo").getSelectedKey() && !this.byId("CD_id_Status").getSelectedKey()){

            this.CD_read(true)
            }else{
                this.CD_read(false)
            }
        },
        CD_read: async function (flag) {
            const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();
            const omainModel = this.getOwnerComponent().getModel("mainModel")?.getData() || [];



            const sRoomNo = this.byId("PCD_id_RoomNo").getSelectedKey()
                || this.byId("PCD_id_RoomNo").getValue();


            const sStatus = this.byId("CD_id_Status").getSelectedKey()
                || this.byId("CD_id_Status").getValue();

            let aBranchCodes = "";

            if (Array.isArray(omainModel) && omainModel.length) {
                aBranchCodes = omainModel.map(item => item.BranchID).flat().filter(Boolean).join(",");
            } else if (oExistingModel.BranchCode) {
                aBranchCodes = oExistingModel.BranchCode;
            }

            let filters = {};

            if (oExistingModel.Role === "Admin" && aBranchCodes) {
                filters.BranchCode = aBranchCodes;
            } else if (oExistingModel.Role === "SuperAdmin") {
                filters.BranchCode = "";
            } else {
                filters.BranchCode = oExistingModel.BranchCode;
            }
            if (sRoomNo) filters.RoomNo = sRoomNo;
            if (sStatus) filters.Status = sStatus;

            this.getBusyDialog()
            await this.ajaxReadWithJQuery("HM_Complaint", filters).then((oData) => {
                var oFCIAerData = Array.isArray(oData.commentData) ? oData.commentData : [oData.commentData];

                const branchData = this.getView().getModel("sBRModel")?.getData() || [];

                // Map BranchCode to BranchName directly in response
                var response = oFCIAerData.map(complain => {
                    const branch = branchData.find(br => br.BranchID === complain.BranchCode);
                    return {
                        ...complain,
                        BranchName: branch ? branch.Name : complain.BranchID
                    };
                });
                if (flag===true) {
                    this._originalRoomdata = response;
                }
                var model = new JSONModel(response);
                this.getView().setModel(model, "ComplaintModel");

                this._populateUniqueFilterValues(this._originalRoomdata);

            })
            this.closeBusyDialog()

        },
        _populateUniqueFilterValues: function (data) {
            let uniqueValues = {
                PCD_id_RoomNo: new Set(),
                CD_id_Status: new Set(),


            };

            data.forEach(item => {

                if (item.RoomNo && item.RoomNo.trim()) {
                    uniqueValues.PCD_id_RoomNo.add(item.RoomNo.trim());
                }
                if (item.Status && item.Status.trim()) {
                    uniqueValues.CD_id_Status.add(item.Status.trim());
                }
            });

            let oView = this.getView();

            ["PCD_id_RoomNo", "CD_id_Status"].forEach(field => {
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
        createTableSheet: function () {
            return [{
                label: "Property Name",
                property: "BranchName",
                type: "string"
            },
                {
                label: "Name",
                property: "RaisedBy",
                type: "string"
            },
            {
                label: "Complaint Type",
                property: "ComplaintType",
                type: "string"
            },
            {
                label: "Description",
                property: "Description",
                type: "string"
            },
            {
                label: "Complaint Date",
                property: "ComplaintRaisedDate",
                type: "string"
            },
            {
                label: "Room No",
                property: "RoomNo",
                type: "string"
            },
            {
                label: "Estimat Date",
                property: "EstimatDate",
                type: "string",
                inputFormat: "string"
            },
            {
                label: "Status",
                property: "Status",
                type: "string"
            },
            {
                label: "Assigned To",
                property: "AssignedBy",
                type: "string"
            },
            {
                label: "Resolution Date",
                property: "ResolutionDate",
                type: "string"
            }
            ]
        },
        
        CD_onDownload: function () {
            const oModel = this.byId("idPOTable1").getModel("ComplaintModel").getData();
            if (!oModel || oModel.length === 0) {
                MessageToast.show(this.i18nModel.getText("MSnodata"));
                return;
            }
            const safeDate = (value) => {
                if (!value || value === 0 || value === "0" || value === "00000000") {
                    return "";
                }
                const formatted = Formatter.formatDate(value);
                if (!formatted || formatted === "Invalid Date" || formatted.includes("1899")) {
                    return "";
                }
                return formatted;
            };

            const adjustedData = oModel.map(item => ({
                ...item,
                ComplaintRaisedDate: safeDate(item.ComplaintRaisedDate),
                EstimatDate: safeDate(item.EstimatDate),
                ResolutionDate: safeDate(item.ResolutionDate)
            }));
            const aCols = this.createTableSheet();
            const oSettings = {
                workbook: {
                    columns: aCols,
                    hierarchyLevel: "Level",
                    context: {
                        sheetName: "Complaint Details"
                    }
                },
                dataSource: adjustedData,
                fileName: "Complain_Details.xlsx",
                worker: false
            };
            const oSheet = new sap.ui.export.Spreadsheet(oSettings);

            oSheet.build().then(() => {
                MessageToast.show(this.i18nModel.getText("MSdownloadedsuccess"));
            }).finally(() => {
                oSheet.destroy();
            });
        },

        CD_Dashboard: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteComplainDashboard", {
                sPath: "Complaindetails",
            });
        },
        CD_Assign: async function () {

            var StaffModel = this.getView().getModel("StaffModel").getData();

            var table = this.byId("idPOTable1");

            var selected = table.getSelectedItem();

            if (!selected) {
                MessageToast.show(this.i18nModel.getText("pleaseSelectRecordtoAssign"));
                return;
            }

            var Model = selected.getBindingContext("ComplaintModel");
            var data = Model.getObject();
            var Staffs = StaffModel.filter(function (element) {
                return element.BranchCode.includes(data.BranchCode);
            });
            var oFilteredModel = new sap.ui.model.json.JSONModel(Staffs);
            this.getView().setModel(oFilteredModel, "FilteredStaffModel");

            this.flag = false
            if (data.Status === "Resolved") {
                MessageToast.show(this.i18nModel.getText("wecannotAssign"));
                return;
            }
            var oView = this.getView()
            if (!this.CD_Dialog) {
                this.CD_Dialog = sap.ui.xmlfragment(
                    oView.getId(),
                    "sap.ui.com.project1.fragment.Complain_Assign",
                    this
                );
                oView.addDependent(this.CD_Dialog);
            }
            this.CD_Dialog.open();
            this.byId("CD_id_ResolutionDate").setVisible(false);

            if (data.Status === "Pending") {
                this.byId("CD_id_Assignedto").setVisible(true).setSelectedKey("").setValueState("None");
                this.byId("CD_id_EstimatedDate").setVisible(true).setValue("").setMinDate(new Date(data.ComplaintRaisedDate)).setValueState("None");
            } else {
                this.byId("CD_id_Assignedto").setVisible(true).setSelectedKey(data.AssignedBy).setValueState("None");
                this.byId("CD_id_EstimatedDate").setVisible(true).setValue(Formatter.formatDate(data.EstimatDate)).setMinDate(new Date(data.ComplaintRaisedDate)).setValueState("None");
            }
        },
        CD_onPressClear: function () {
            this.getView().byId("PCD_id_RoomNo").setSelectedKey("")
            this.getView().byId("CD_id_Status").setSelectedKey("")
        },
        CD_viewimage: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("ComplaintModel");
            var oData = oContext.getObject();

            if (!oData.File || !oData.File.length) {
                sap.m.MessageBox.information(
                    "No Image is uploaded.",
                    {
                        title: "Information",
                        styleClass: "myUnifiedBtn"
                    }
                );
                return;
            }

            var sBase64 = oData.File.replace(/\s/g, "");
            var sPhotoName = oData.FileName || "Room Photo";
            if (sBase64 && !sBase64.startsWith("data:image")) {
                sBase64 = "data:image/jpeg;base64," + sBase64;
            }

            var oImage = new sap.m.Image({
                src: sBase64,
                densityAware: false,
                decorative: false,
                width: "100%",
                height: "100%",
                style: "object-fit: cover; display:block; margin:0; padding:0;"
            })

            var oDialog = new sap.m.Dialog({
                title: sPhotoName,
                contentWidth: "50%",
                contentHeight: "60%",
                horizontalScrolling: true,
                verticalScrolling: false,
                content: [oImage],
                endButton: new sap.m.Button({
                    text: "Close",
                    press: function () {
                        oDialog.close();
                    }
                }).addStyleClass("myUnifiedBtn"),
                afterClose: function () {
                    oDialog.destroy();
                }
            }).addStyleClass("barheader");

            oDialog.addStyleClass("ImageDialogNoPadding");
            oDialog.open();
        },
        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");

        },
        onAddComplainSave: async function () {
            var Assignedto = this.byId("CD_id_Assignedto").getValue()
            var EstimatDate = this.byId("CD_id_EstimatedDate").getValue()
            var ResolutionDate = this.byId("CD_id_ResolutionDate").getValue()



            var table = this.byId("idPOTable1");
            var selected = table.getSelectedItem();

            if (!selected) {
                sap.m.MessageToast.show(
                    this.i18nModel.getText("pleaseSelectRecordtoAssignRoom")
                );
                return;
            }

            var oContext = selected.getBindingContext("ComplaintModel");
            var Complaint = oContext.getObject();

            if (Complaint.Status === "Pending" || Complaint.Status === "In Progress" && this.flag === false) {
                if (
                    !utils._LCvalidateMandatoryField(this.getView().byId("CD_id_Assignedto"), "ID") ||
                    !utils._LCvalidateMandatoryField(this.getView().byId("CD_id_EstimatedDate"), "ID")

                ) {
                    sap.m.MessageToast.show(
                        this.i18nModel.getText(
                            "pleaseFillallRequiredFieldsCorrectlybeforeSaving"
                        )
                    );
                    return;
                }
            }

            if (Complaint.Status === "In Progress" && this.flag === true) {
                if (
                    !utils._LCvalidateMandatoryField(this.getView().byId("CD_id_ResolutionDate"), "ID")
                ) {
                    sap.m.MessageToast.show(
                        this.i18nModel.getText(
                            "pleaseFillallRequiredFieldsCorrectlybeforeSaving"
                        )
                    );
                    return;
                }
            }
            if ((Complaint.Status === "Pending" || Complaint.Status === "In Progress") && this.flag === false) {
                var payload = {
                    AssignedBy: Assignedto,
                    EstimatDate: EstimatDate.includes("-") ? EstimatDate : EstimatDate.split("/").reverse().join("-"),
                    Status: "In Progress"
                };
            }
            if ((Complaint.Status === "In Progress" || Complaint.Status === "Resolved") && this.flag === true) {
                var payload = {
                    ResolutionDate: ResolutionDate.split("/").reverse().join("-") || "",
                    Status: "Resolved"
                };
            }
            this.getBusyDialog()

            await this.ajaxUpdateWithJQuery("HM_Complaint", {
                data: payload,
                filters: {
                    ComplaintID: Complaint.ComplaintID
                },
            });
            this.CD_read(true)
            MessageToast.show(this.i18nModel.getText("ComplaintUpdatedSuccessfully"));

            var table = this.byId("idPOTable1");
            table.removeSelections();
            this.CD_Dialog.close();

        },
        onAddComplainCancel: function () {
            var table = this.byId("idPOTable1");
            table.removeSelections();
            this.CD_Dialog.close();

        },
        onNoOfPersonInputLiveChange: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent.getSource(), "ID");
        },
        CD_resolve: function () {
            var table = this.byId("idPOTable1");
            var selected = table.getSelectedItem();

            if (!selected) {
                MessageToast.show(this.i18nModel.getText("pleaseSelectRecordtoresolve"));
                return;
            }

            var Model = selected.getBindingContext("ComplaintModel");
            var data = Model.getObject();
            this.flag = true
            if (data.Status === "Pending") {
                MessageToast.show(this.i18nModel.getText("wecannotresolve"));
                return;
            }
            var oView = this.getView()
            if (!this.CD_Dialog) {
                this.CD_Dialog = sap.ui.xmlfragment(
                    oView.getId(),
                    "sap.ui.com.project1.fragment.Complain_Assign",
                    this
                );
                oView.addDependent(this.CD_Dialog);
            }
            this.CD_Dialog.open();
            this.byId("CD_id_Assignedto").setVisible(false);
            this.byId("CD_id_EstimatedDate").setVisible(false);
            if (data.Status === "In Progress") {
                this.byId("CD_id_ResolutionDate").setVisible(true).setValue("").setMinDate(new Date(data.ComplaintRaisedDate)).setValueState("None");
            } else {
                this.byId("CD_id_ResolutionDate").setVisible(true).setValue(Formatter.formatDate(data.ResolutionDate)).setMinDate(new Date(data.ComplaintRaisedDate)).setValueState("None");
            }


        },
        onHome: function () {
            this.CommonLogoutFunction();
            this.getView().getModel("ComplaintModel").setData({});
        },
    });
});