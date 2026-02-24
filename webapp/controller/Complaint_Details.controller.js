sap.ui.define([
    "./BaseController",
    "../model/formatter",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/BusyIndicator",
    "sap/m/MessageToast",
       "../utils/validation",
], function (
    BaseController,
    Formatter,
    JSONModel,
    BusyIndicator,
    MessageToast,
    utils

) {
    "use strict";

    return BaseController.extend("sap.ui.com.project1.controller.Complaint_Details", {
        Formatter: Formatter,

        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteComplaintDetails").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: function () {
            this.CD_read()
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            this._ViewDatePickersReadOnly(["CD_id_EstimatedDate", "CD_id_ResolutionDate"], sap.ui.getCore());



        },
        CD_read: async function () {
            const oExistingModel = this.getOwnerComponent().getModel("LoginModel").getData();
            const omainModel = this.getOwnerComponent().getModel("mainModel")?.getData() || [];

                 const sBranchName = this.byId("CD_id_BranchName").getSelectedKey()
                    || this.byId("CD_id_BranchName").getValue();

                const sRoomNo = this.byId("PCD_id_RoomNo").getSelectedKey()
                    || this.byId("PCD_id_RoomNo").getValue();

                    
                const sStatus= this.byId("CD_id_Status").getSelectedKey()
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
                if (sBranchName) filters.BranchCode = sBranchName;
                if (sRoomNo) filters.RoomNo = sRoomNo;
                if (sStatus) filters.Status = sStatus;

            sap.ui.core.BusyIndicator.show(0);
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
                var model = new JSONModel(response);
                this.getView().setModel(model, "ComplaintModel");
                   
                this._populateUniqueFilterValues(response);

            })
            sap.ui.core.BusyIndicator.hide();

        },
          _populateUniqueFilterValues: function (data) {
            let uniqueValues = {
                CD_id_BranchName: new Set(),
                PCD_id_RoomNo: new Set(),
                CD_id_Status: new Set(),

            
            };

            data.forEach(item => {
                  if (item.BranchCode && item.BranchCode.trim()) {
                    uniqueValues.CD_id_BranchName.add(item.BranchCode.trim());
                }
                if (item.RoomNo && item.RoomNo.trim()) {
                    uniqueValues.PCD_id_RoomNo.add(item.RoomNo.trim());
                }
                  if (item.Status && item.Status.trim()) {
                    uniqueValues.CD_id_Status.add(item.Status.trim());
                }
            });

            let oView = this.getView();

            ["CD_id_BranchName","PCD_id_RoomNo","CD_id_Status"].forEach(field => {
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
        CD_Assign: function () {
            var table = this.byId("idPOTable1");
            var selected = table.getSelectedItem();

            if (!selected) {
                MessageToast.show(this.i18nModel.getText("pleaseSelectRecordtoAssign"));
                return;
            }

            var Model = selected.getBindingContext("ComplaintModel");
            var data = Model.getObject();
            if (data.Status === "In Progress" || data.Status === "Resolved") {
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
            this.byId("CD_id_Assignedto").setVisible(true).setValue("");
            this.byId("CD_id_EstimatedDate").setVisible(true).setValue("");
        },
        CD_onPressClear:function(){
             this.getView().byId("CD_id_BranchName").setSelectedKey("")
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
                        title: "Information"
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

              if (Complaint.Status === "Pending") {
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

    if (Complaint.Status === "In Progress") {
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
            if(Complaint.Status==="Pending"){
            var payload = {
                AssignedBy: Assignedto,
                EstimatDate: EstimatDate,
              

                Status: "In Progress"
            };
        }else{
              var payload = {
                ResolutionDate: ResolutionDate.split("/").reverse().join("-") || "",
                Status:"Resolved"
            };
        }
            await this.ajaxUpdateWithJQuery("HM_Complaint", {
                data: payload,
                filters: {
                    ComplaintID: Complaint.ComplaintID
                },
            });
            this.CD_read()
            this.CD_Dialog.close();

        },
        onAddComplainCancel: function () {
            this.CD_Dialog.close();

        },
        onNoOfPersonInputLiveChange:function(oEvent){
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
            if (data.Status === "Pending" || data.Status === "Resolved") {
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
            this.byId("CD_id_ResolutionDate").setVisible(true).setValue("");


        },
    });
});