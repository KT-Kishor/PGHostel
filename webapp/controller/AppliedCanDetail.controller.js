sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../model/formatter"
], function (BaseController,
    JSONModel, formatter) {
    "use strict";

    return BaseController.extend("sap.kt.com.minihrsolution.controller.AppliedCanDetail", {
        formatter: formatter,
        onInit: function () {
            const router = this.getOwnerComponent().getRouter();
            router
                .getRoute("AppliedCanDetail")
                .attachPatternMatched(this._onObjectMatched, this);
        },
        _onObjectMatched: async function (oEvent) {
            var LoginFUnction = await this.commonLoginFunction("Recruitment");
            if (!LoginFUnction) return;
            this.sUserId = oEvent.getParameter("arguments").id;
            let data = this.getView().getModel("DataTableModel").getData();
            // console.log(data);
            let filterData = data.find((Element) => Element.ID === this.sUserId);
            // console.log(filterData);
            let formModel = new JSONModel(filterData);
            this.getView().setModel(formModel, "setDataToForm");

        },

        onPageNavButtonPress: function () {
            this.getOwnerComponent().getRouter().navTo("AppliedCandidates"); // Navigate to tile page
        },

        onLogout: function () {
            this.CommonLogoutFunction(); // Navigate to login page 
        },
        onDownloadResume: function () {
            const oData = this.getView().getModel("setDataToForm").getData();
            console.log("Resume Data:", oData);

            let base64String = oData.ResumeFile;
            const sFileName = oData.FileName || "Resume";
            const sMimeType = oData.MimeType || "application/octet-stream";

            if (!base64String) {
                sap.m.MessageToast.show("No resume data found.");
                return;
            }

            if (base64String.startsWith("data:")) {
                base64String = base64String.split(",")[1];
            }

            try {
                // Step 2: Decode base64
                const binary = atob(base64String);
                const len = binary.length;
                const buffer = new Uint8Array(len);

                for (let i = 0; i < len; i++) {
                    buffer[i] = binary.charCodeAt(i);
                }

                const blob = new Blob([buffer], { type: sMimeType });

                // Step 3: Trigger download
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = sFileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } catch (e) {
                console.error("Failed to decode Base64:", e);
                sap.m.MessageToast.show("Failed to download resume.");
            }
        },

        openResumePreview: function () {
            const oData = this.getView().getModel("setDataToForm").getData();
            let base64String = oData.ResumeFile;
            const sMimeType = oData.MimeType || "application/pdf";
            const sFileName = oData.FileName || "Resume.pdf";

            if (!base64String) {
                sap.m.MessageToast.show("No resume data found.");
                return;
            }

            // Clean base64 if prefixed
            if (base64String.startsWith("data:")) {
                base64String = base64String.split(",")[1];
            }

            // Convert base64 to Blob and get object URL
            const byteCharacters = atob(base64String);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: sMimeType });
            const blobUrl = URL.createObjectURL(blob);

            // Destroy previous dialog if exists
            if (this._oResumeDialog) {
                this._oResumeDialog.destroy();
                this._oResumeDialog = null;
            }

            // Create dialog
            this._oResumeDialog = new sap.m.Dialog({
                title: sFileName,
                stretch: true, // Fullscreen on all devices
                draggable: true,
                resizable: true,
                content: [
                    new sap.ui.core.HTML({
                        content: `
                    <div style="width:100%; height:100%;">
                        <iframe 
                            src="${blobUrl}" 
                            style="width:100%; height:600px; border:none;">
                        </iframe>
                    </div>
                `
                    })
                ],
                beginButton: new sap.m.Button({
                    text: "Close",
                    press: function () {
                        this._oResumeDialog.close();
                        this._oResumeDialog.destroy();
                        this._oResumeDialog = null;
                        URL.revokeObjectURL(blobUrl); // Clean up memory
                    }.bind(this)
                })
            });

            this.getView().addDependent(this._oResumeDialog);
            this._oResumeDialog.open();
        }

    });
});
