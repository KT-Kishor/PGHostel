sap.ui.define([
	"./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "../model/formatter",
], function(
BaseController, utils, JSONModel, MessageToast, Formatter
) {
	"use strict";
	return BaseController.extend("sap.kt.com.minihrsolution.controller.HRSolutions_Demo", {
	 Formatter: Formatter,
		 onInit: function () {
            
          this.getRouter().getRoute("HRSolutions_Demo").attachMatched(this._onRouteMatched, this);

          // Form Data
          var oFormData = new JSONModel({
            CustomerName: "",
            CompanyName: "",
            Email: "",
            Address: "",
            TimeSlot: "",
            MobileNo: "",
            Comments: "",
          });
          this.getView().setModel(oFormData, "formData");

          // Load carousel videos etc. when route matches
          this._careerDataLoaded = false; // flag to avoid repeated fetch
        },

        _onRouteMatched: function () {
           this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
      

        //   sessionStorage.removeItem("homePageReturnTab");
          this.API = "https://rest.kalpavrikshatechnologies.com";
		},
    onpresshome: function(){
              this.getOwnerComponent().getRouter().navTo("RouteHomePage");
		},
		onOpenDemoForm: function() {
			  if (!this._oDemoFormDialog) {
            this._oDemoFormDialog = sap.ui.xmlfragment(
              this.getView().getId(), "sap.kt.com.minihrsolution.fragment.NewDemoform",
              this
            );
            this.getView().addDependent(this._oDemoFormDialog);
          }
          this._oDemoFormDialog.open();
		},
 onCloseDemoForm: function () {
          if (this._oDemoFormDialog) {
            this._oDemoFormDialog.close();
          }
        },
          validateCompnayname: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },
        validateName: function (oEvent) {
          utils._LCvalidateName(oEvent);
        },
        validateMobileNo: function (oEvent) {
          utils._LCvalidateMobileNumber(oEvent);
        },
        validateEmail: function (oEvent) {
          utils._LCvalidateEmail(oEvent);
        },
        ValidateCommonFields: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },
		 onDemoformSave: function () {
      var that = this;
          var oModel = this.getView().getModel("formData");
          var oData = JSON.parse(JSON.stringify(oModel.getData())); // Deep copy to avoid reference issues
          var payload = [oData];

          // Form Validation
          if (
            utils._LCvalidateMandatoryField(this.byId("idCompanyname"), "ID") &&
            utils._LCvalidateName(this.byId("idcustomername"), "ID") &&
            utils._LCvalidateEmail(this.byId("idCustmailid"), "ID") &&
            utils._LCvalidateMandatoryField(this.byId("idtimeslot"), "ID") &&
            utils._LCvalidateMobileNumber(this.byId("idmobilenumber"), "ID") &&
            utils._LCvalidateMandatoryField(this.byId("idCustaddress"), "ID") &&
            utils._LCvalidateMandatoryField(this.byId("idcomment"), "ID")
          ) {
            // AJAX Call to Save Data
            $.ajax({
              url: this.API + "/CustomerDemo",
              type: "POST",
              headers: {
                "Content-Type": "application/json",
                name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                password:
                  "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
              },
              data: JSON.stringify(payload),
              success: function (response) {
                var resetData = {
                  CustomerName: "",
                  CompanyName: "",
                  Email: "",
                  Address: "",
                  TimeSlot: "",
                  MobileNo: "",
                  Comments: "",
                };

                oModel.setData(resetData);
                oModel.refresh(true);
             
            that._oDemoFormDialog.close();
          
             MessageToast.show("Thanks For Submitting the form. Our team will get back to you soon!");

                // AJAX Call to Send Email
              },
              error: function (xhr, status, error) {
                MessageToast.show("Error saving data. Please try again.");
              },
            });
          } else {
            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
          }
        },
       onAfterRendering: function () {
 this._applyResponsiveVideo("videoBox_A", "videoFrameHtml_A", "../Videos/Employee Offer.mp4");
 this._applyResponsiveVideo("videoBox_B", "videoFrameHtml_B", "../Videos/Trainee Application.mp4");
 this._applyResponsiveVideo("videoBox_C", "videoFrameHtml_C", "../Videos/Contract Offer Application.mp4");
 this._applyResponsiveVideo("videoBox_D", "videoFrameHtml_D", "../Videos/Self Service.mp4");
 this._applyResponsiveVideo("videoBox_E", "videoFrameHtml_E", "../Videos/Employee Details.mp4");
 this._applyResponsiveVideo("videoBox_F", "videoFrameHtml_F", "../Videos/Leave Application.mp4");
 this._applyResponsiveVideo("videoBox_G", "videoFrameHtml_G", "../Videos/Expense Application.mp4");
 this._applyResponsiveVideo("videoBox_H", "videoFrameHtml_H", "../Videos/Timesheet Application.mp4");
 this._applyResponsiveVideo("videoBox_I", "videoFrameHtml_I", "../Videos/Generate Payslip.mp4");
 this._applyResponsiveVideo("videoBox_J", "videoFrameHtml_J", "../Videos/My Inbox.mp4");
},
  _applyResponsiveVideo: function (vBoxId, htmlId, videoUrl) {
        var oVBox = this.byId(vBoxId);
        var oHtml = this.byId(htmlId);
        if (!oVBox || !oHtml) return;

        var iWidth = window.innerWidth;
        var bResponsive = sap.ui.Device.system.phone || iWidth < 768; // treat <768px as mobile

        // check if first video (autoplay required only for videoBox101)
        var bAutoplay = (vBoxId === "videoBox_A");

        // common video tag (without sizing)
        var sVideoTag = "<video controls " +
            (bAutoplay ? "autoplay muted playsinline " : "") +
            "style='border:none;border-radius:15px;overflow:hidden;width:100%;height:100%;object-fit:cover;'>" +
            "<source src='" + videoUrl + "' type='video/mp4'>" +
            "Your browser does not support the video tag." +
            "</video>";

        // responsive wrapper (16:9 aspect ratio)
        var sResponsiveWrapper =
            "<div style='position:relative;width:100%;padding-top:56.25%;border-radius:15px;overflow:hidden;'>" +
            "<div style='position:absolute;top:0;left:0;width:100%;height:100%;'>" +
            sVideoTag +
            "</div>" +
            "</div>";

        // desktop fixed size version
        var sDesktop =
            "<div style='width:560px;height:315px;border-radius:15px;overflow:hidden;'>" +
            sVideoTag +
            "</div>";

        if (bResponsive) {
            oHtml.setContent(sResponsiveWrapper); // mobile fluid
        } else {
            oHtml.setContent(sDesktop); // desktop fixed
        }
    }

	});
});